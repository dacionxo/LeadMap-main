/**
 * Calendar Sync Cron Job
 * 
 * Periodic sync of Google Calendar events (pulls new/updated events).
 * Runs every 15 minutes
 * 
 * This cron job:
 * - Fetches all active Google Calendar connections with sync enabled
 * - Refreshes access tokens if needed (expiring within 5 minutes)
 * - Fetches events from Google Calendar API (last 24 hours to next 7 days)
 * - Compares with local database and creates/updates events
 * - Skips events if local version is newer (prevents overwriting local changes)
 * - Handles all-day events properly
 * - Stores attendees, organizer, recurrence data
 * - Updates last_sync_at timestamp after successful sync
 * 
 * Vercel Cron calls with GET, but we also support POST for manual triggers
 * 
 * @module app/api/calendar/cron/sync
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyCronRequestOrError } from '@/lib/cron/auth'
import { handleCronError, DatabaseError, ValidationError } from '@/lib/cron/errors'
import { createSuccessResponse, createNoDataResponse } from '@/lib/cron/responses'
import { getCronSupabaseClient, executeSelectOperation, executeUpdateOperation, executeInsertOperation } from '@/lib/cron/database'
import { getValidAccessToken } from '@/lib/google-calendar-sync'
import { fetchGoogleCalendarEvents as fetchGoogleEvents, normalizeGoogleEventToDb } from '@/lib/calendar-import'
import { dbDatetimeNullable, dbDatetimeRequired } from '@/lib/cron/zod'
import type { CronJobResult, BatchProcessingStats } from '@/lib/types/cron'

export const runtime = 'nodejs'

/**
 * Calendar connection structure from database
 */
interface CalendarConnection {
  id: string
  user_id: string
  provider: 'google'
  email: string
  access_token?: string | null
  refresh_token?: string | null
  token_expires_at?: string | null
  calendar_id?: string | null
  calendar_name?: string | null
  sync_enabled: boolean
  last_sync_at?: string | null
  sync_token?: string | null
  created_at: string
  updated_at?: string | null
}

/**
 * Google Calendar event structure from API
 */
interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end?: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  status?: string
  updated?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  organizer?: {
    email?: string
    displayName?: string
  }
  recurrence?: string[]
  hangoutLink?: string
}

/**
 * Calendar event structure for database
 * Synced events use the same shape as user-created events so they propagate as normal events.
 */
interface CalendarEvent {
  id?: string
  user_id: string
  title: string
  description?: string | null
  event_type: string
  start_time: string
  end_time: string
  all_day: boolean
  start_date?: string | null
  end_date?: string | null
  location?: string | null
  timezone?: string | null
  event_timezone?: string | null
  external_event_id: string
  external_calendar_id: string
  sync_status: string
  last_synced_at: string
  status: string
  attendees?: string | null
  organizer_email?: string | null
  organizer_name?: string | null
  recurrence_rule?: string | null
  conferencing_link?: string | null
  conferencing_provider?: string | null
  updated_at?: string | null
}

/**
 * Sync result for individual connection
 */
interface ConnectionSyncResult extends CronJobResult {
  connectionId: string
  email: string
  synced?: number
  updated?: number
  skipped?: number
}

/**
 * Response structure for calendar sync
 */
interface CalendarSyncResponse {
  success: boolean
  timestamp: string
  synced: number
  updated: number
  skipped: number
  total: number
  results: ConnectionSyncResult[]
  stats?: BatchProcessingStats
  message?: string
}

/**
 * Zod schema for calendar connection validation
 */
const calendarConnectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: z.literal('google'),
  email: z.string().email(),
  access_token: z.string().nullable().optional(),
  refresh_token: z.string().nullable().optional(),
  token_expires_at: dbDatetimeNullable,
  calendar_id: z.string().nullable().optional(),
  calendar_name: z.string().nullable().optional(),
  sync_enabled: z.boolean(),
  last_sync_at: dbDatetimeNullable,
  sync_token: z.string().nullable().optional(),
  created_at: dbDatetimeRequired,
  updated_at: dbDatetimeNullable,
})

/**
 * Validates and parses calendar connection data
 * 
 * @param connection - Raw connection data from database
 * @returns Validated calendar connection
 * @throws ValidationError if validation fails
 */
function validateCalendarConnection(connection: unknown): CalendarConnection {
  const result = calendarConnectionSchema.safeParse(connection)
  
  if (!result.success) {
    throw new ValidationError(
      'Invalid calendar connection structure',
      result.error.issues
    )
  }
  
  return result.data
}

/**
 * Fetches active Google Calendar connections that need syncing
 * Filters by provider and sync_enabled flag
 * 
 * @param supabase - Supabase client
 * @returns Array of validated calendar connections
 */
async function fetchActiveConnections(
  supabase: ReturnType<typeof getCronSupabaseClient>
): Promise<CalendarConnection[]> {
  const result = await executeSelectOperation<CalendarConnection>(
    supabase,
    'calendar_connections',
    '*',
    (query) => {
      return (query as any)
        .eq('provider', 'google')
        .eq('sync_enabled', true)
    },
    {
      operation: 'fetch_active_connections',
    }
  )

  if (!result.success) {
    throw new DatabaseError(
      'Failed to fetch active calendar connections',
      result.error
    )
  }

  // Type guard: ensure result.data is an array
  if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
    return []
  }

  // Validate connections, skipping invalid rows to prevent single bad row from killing the job
  const validConnections: CalendarConnection[] = []
  for (const connection of result.data) {
    try {
      validConnections.push(validateCalendarConnection(connection))
    } catch (error) {
      const connectionId = (connection as any)?.id || 'unknown'
      const email = (connection as any)?.email || 'unknown'
      console.error(`[Calendar Sync] Skipping invalid connection ${connectionId} (${email}):`, error)
    }
  }

  return validConnections
}

/**
 * Gets valid access token and refreshes if needed
 * Updates token in database if it was refreshed
 * 
 * @param connection - Calendar connection
 * @param supabase - Supabase client
 * @returns Valid access token or null if refresh failed
 */
async function getValidTokenAndUpdate(
  connection: CalendarConnection,
  supabase: ReturnType<typeof getCronSupabaseClient>
): Promise<string | null> {
  const validAccessToken = await getValidAccessToken(
    connection.access_token || '',
    connection.refresh_token || null,
    connection.token_expires_at || null
  )

  if (!validAccessToken) {
    return null
  }

  // Update token if it was refreshed
  if (validAccessToken !== connection.access_token) {
    console.log(`[Calendar Sync] Refreshed access token for connection ${connection.id}`)
    
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    const updateResult = await executeUpdateOperation(
      supabase,
      'calendar_connections',
      {
        access_token: validAccessToken,
        token_expires_at: expiresAt,
      },
      (query) => (query as any).eq('id', connection.id),
      {
        operation: 'update_access_token',
        connectionId: connection.id,
      }
    )

    if (!updateResult.success) {
      console.error(`[Calendar Sync] Failed to update access token for connection ${connection.id}:`, updateResult.error)
      // Continue with the refreshed token even if DB update fails
    }
  }

  return validAccessToken
}

/** Time window for full sync: match manual sync (cal-sync style 90-day lookback, 365-day lookahead) */
const FULL_SYNC_DAYS_BACK = 90
const FULL_SYNC_DAYS_FORWARD = 365


/**
 * Syncs events for a calendar connection.
 * Uses incremental sync (syncToken) when available; otherwise full sync with wide window (cal-sync style).
 * Applies loop prevention (synced_by_system) and deletion propagation (cancelled events).
 */
async function syncConnectionEvents(
  connection: CalendarConnection,
  accessToken: string,
  supabase: ReturnType<typeof getCronSupabaseClient>,
  timeMin: Date,
  timeMax: Date
): Promise<ConnectionSyncResult> {
  const calendarId = connection.calendar_id || 'primary'

  // User timezone for normalizing events
  let userTimezone = 'UTC'
  const { data: settings } = await supabase
    .from('user_calendar_settings')
    .select('default_timezone')
    .eq('user_id', connection.user_id)
    .single()
  if (settings?.default_timezone) userTimezone = settings.default_timezone

  let events: any[] = []
  let nextSyncToken: string | null = null
  let syncTokenExpired = false

  const fetchResult = await fetchGoogleEvents({
    accessToken,
    calendarId,
    syncToken: connection.sync_token || undefined,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxPages: 15,
  })

  if (fetchResult.syncTokenExpired) {
    syncTokenExpired = true
    const retry = await fetchGoogleEvents({
      accessToken,
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxPages: 15,
    })
    if (!retry.success) {
      return {
        connectionId: connection.id,
        email: connection.email,
        status: 'failed',
        error: retry.error || 'Failed to fetch events after sync token expired',
      }
    }
    events = retry.events
    nextSyncToken = retry.nextSyncToken
  } else if (!fetchResult.success) {
    return {
      connectionId: connection.id,
      email: connection.email,
      status: 'failed',
      error: fetchResult.error || 'Failed to fetch events from Google Calendar',
    }
  } else {
    events = fetchResult.events
    nextSyncToken = fetchResult.nextSyncToken
  }

  if (syncTokenExpired) {
    await executeUpdateOperation(
      supabase,
      'calendar_connections',
      { sync_token: null },
      (q) => (q as any).eq('id', connection.id),
      { operation: 'clear_sync_token', connectionId: connection.id }
    )
  }

  let syncedCount = 0
  let updatedCount = 0
  let skippedCount = 0

  for (const googleEvent of events) {
    try {
      const normalized = normalizeGoogleEventToDb({
        googleEvent,
        userId: connection.user_id,
        calendarId,
        userTimezone,
        includeContentHash: false,
      })

      if (normalized.skip) {
        if (normalized.reason === 'cancelled') {
          const existingResult = await executeSelectOperation<{ id: string }>(
            supabase,
            'calendar_events',
            'id',
            (q) => (q as any).eq('external_event_id', googleEvent.id).eq('user_id', connection.user_id),
            { operation: 'find_for_delete', externalEventId: googleEvent.id }
          )
          if (existingResult.success && existingResult.data && Array.isArray(existingResult.data) && existingResult.data.length > 0) {
            await supabase.from('calendar_events').delete().eq('id', existingResult.data[0].id)
          }
        }
        skippedCount++
        continue
      }

      const eventData = normalized.eventData as Record<string, unknown>
      const existingResult = await executeSelectOperation<{ id: string }>(
        supabase,
        'calendar_events',
        'id',
        (query) => (query as any).eq('external_event_id', googleEvent.id).eq('user_id', connection.user_id),
        { operation: 'check_existing_event', externalEventId: googleEvent.id }
      )
      let existing: { id: string } | null = null
      if (existingResult.success && existingResult.data && Array.isArray(existingResult.data) && existingResult.data.length > 0) {
        existing = existingResult.data[0]
      }

      if (existing) {
        const { id: _id, ...updateData } = eventData
        const updatePayload: Record<string, unknown> = { ...updateData }
        const updateResult = await executeUpdateOperation(
          supabase,
          'calendar_events',
          updatePayload,
          (query) => (query as any).eq('id', existing!.id),
          { operation: 'update_calendar_event', eventId: existing!.id }
        )
        if (updateResult.success) updatedCount++
        else skippedCount++
      } else {
        const insertResult = await executeInsertOperation(
          supabase,
          'calendar_events',
          eventData,
          { operation: 'create_calendar_event', externalEventId: googleEvent.id }
        )
        if (insertResult.success) syncedCount++
        else skippedCount++
      }
    } catch (error) {
      console.error(`[Calendar Sync] Error processing event ${googleEvent.id}:`, error)
      skippedCount++
    }
  }

  const connectionUpdate: Record<string, unknown> = { last_sync_at: new Date().toISOString() }
  if (nextSyncToken) connectionUpdate.sync_token = nextSyncToken
  await executeUpdateOperation(
    supabase,
    'calendar_connections',
    connectionUpdate,
    (query) => (query as any).eq('id', connection.id),
    { operation: 'update_last_sync_at', connectionId: connection.id }
  )

  return {
    connectionId: connection.id,
    email: connection.email,
    status: 'success',
    message: 'Calendar synced successfully',
    synced: syncedCount,
    updated: updatedCount,
    skipped: skippedCount,
  }
}

/**
 * Main cron job execution function
 * 
 * @param request - Next.js request object
 * @returns NextResponse with sync results
 */
async function runCronJob(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify authentication
    const authError = verifyCronRequestOrError(request)
    if (authError) {
      return authError
    }

    // Get Supabase client
    const supabase = getCronSupabaseClient()

    // Fetch active connections
    console.log('[Calendar Sync] Fetching active Google Calendar connections...')
    const connections = await fetchActiveConnections(supabase)

    if (connections.length === 0) {
      console.log('[Calendar Sync] No active Google Calendar connections to sync')
      return createNoDataResponse('No active Google Calendar connections to sync')
    }

    console.log(`[Calendar Sync] Found ${connections.length} active connections to sync`)

    const now = new Date()
    const timeMin = new Date(now.getTime() - FULL_SYNC_DAYS_BACK * 24 * 60 * 60 * 1000)
    const timeMax = new Date(now.getTime() + FULL_SYNC_DAYS_FORWARD * 24 * 60 * 60 * 1000)

    const results: ConnectionSyncResult[] = []
    
    // Process each connection
    for (const connection of connections) {
      try {
        // Get valid access token
        const accessToken = await getValidTokenAndUpdate(connection, supabase)

        if (!accessToken) {
          results.push({
            connectionId: connection.id,
            email: connection.email,
            status: 'failed',
            error: 'Could not get valid access token',
          })
          continue
        }

        const syncResult = await syncConnectionEvents(
          connection,
          accessToken,
          supabase,
          timeMin,
          timeMax
        )

        results.push(syncResult)

        if (syncResult.status === 'success') {
          console.log(
            `[Calendar Sync] Successfully synced connection ${connection.id} (${connection.email}): ` +
            `${syncResult.synced} synced, ${syncResult.updated} updated, ${syncResult.skipped} skipped`
          )
        } else {
          console.error(
            `[Calendar Sync] Failed to sync connection ${connection.id} (${connection.email}):`,
            syncResult.error
          )
        }
      } catch (error) {
        console.error(`[Calendar Sync] Error processing connection ${connection.id}:`, error)
        results.push({
          connectionId: connection.id,
          email: connection.email,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        })
      }
    }

    // Calculate statistics
    const synced = results.reduce((sum, r) => sum + (r.synced || 0), 0)
    const updated = results.reduce((sum, r) => sum + (r.updated || 0), 0)
    const skipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0)
    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'failed').length
    const duration = Date.now() - startTime

    const stats: BatchProcessingStats = {
      total: connections.length,
      processed: results.length,
      successful,
      failed,
      skipped: 0, // Not using skipped for connections, only for events
      duration,
    }

    console.log(
      `[Calendar Sync] Completed: ${successful} successful, ${failed} failed, ` +
      `${synced} events synced, ${updated} events updated, ${skipped} events skipped in ${duration}ms`
    )

    // Return success response with results
    return createSuccessResponse<CalendarSyncResponse>(
      {
        success: true,
        timestamp: now.toISOString(),
        synced,
        updated,
        skipped,
        total: connections.length,
        results,
        stats,
        message: `Synced ${successful} of ${connections.length} connections`,
      },
      {
        message: `Synced ${successful} of ${connections.length} connections`,
        processed: results.length,
        results,
      }
    )
  } catch (error) {
    console.error('[Calendar Sync] Fatal error:', error)
    return handleCronError(error, {
      cronJob: 'calendar-sync',
      operation: 'run_cron_job',
    })
  }
}

/**
 * GET handler for Vercel Cron
 * 
 * @param request - Next.js request object
 * @returns NextResponse with sync results
 */
export async function GET(request: NextRequest) {
  return runCronJob(request)
}

/**
 * POST handler for manual triggers
 * 
 * @param request - Next.js request object
 * @returns NextResponse with sync results
 */
export async function POST(request: NextRequest) {
  return runCronJob(request)
}
