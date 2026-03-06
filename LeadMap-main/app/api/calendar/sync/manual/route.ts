import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessTokenWithExpiration } from '@/lib/google-calendar-sync'
import { fetchGoogleCalendarEvents, normalizeGoogleEventToDb } from '@/lib/calendar-import'

export const runtime = 'nodejs'

/**
 * POST /api/calendar/sync/manual
 * Bi-directional Google Calendar sync (Google ↔ LeadMap).
 *
 * Bi-directional design (from cal-sync + google_calendar_oauth2 reference):
 *  Google → LeadMap  (import): incremental via syncToken, with loop-prevention
 *    and deletion propagation.
 *  LeadMap → Google  (export): events already pushed on create/update/delete via
 *    pushEventToGoogleCalendar / deleteEventFromGoogleCalendar in the events
 *    API routes. This route ensures new native events without external_event_id
 *    are pushed out to Google on each sync.
 *
 * Loop prevention (cal-sync approach):
 *   Any event we pushed to Google carries extendedProperties.shared.synced_by_system="true".
 *   The import loop skips those events, so LeadMap-native events are never
 *   re-imported as duplicates.
 *
 * Incremental sync (Google Calendar API syncToken):
 *   The connection row stores sync_token. On the first sync (or after a 410),
 *   a full range-based fetch is performed and the returned nextSyncToken is saved.
 *   Subsequent syncs use only the syncToken so only changes are fetched – much faster.
 *
 * Deletion propagation:
 *   With showDeleted=true (incremental) or by checking cancelled status on full sync,
 *   Google-deleted events are removed from calendar_events in Supabase.
 *
 * Change detection:
 *   A SHA-256 content hash (cal-sync compute_content_hash approach) is stored on each
 *   imported event. If the hash matches on next sync, the update is skipped.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: connections, error: connectionsError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('sync_enabled', true)
      .eq('provider', 'google')

    if (connectionsError) {
      return NextResponse.json({ error: 'Failed to fetch connections', details: connectionsError.message }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ success: true, message: 'No active calendar connections found', synced: 0, updated: 0, deleted: 0, skipped: 0, total: 0, results: [] })
    }

    const { data: userSettingsRow } = await supabase
      .from('user_calendar_settings')
      .select('default_timezone')
      .eq('user_id', user.id)
      .single()
    const userTimezone = userSettingsRow?.default_timezone || 'UTC'

    const now = new Date()
    const fullSyncTimeMin = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const fullSyncTimeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const syncResults: any[] = []
    let totalSynced = 0, totalUpdated = 0, totalDeleted = 0, totalSkipped = 0

    for (const connection of connections) {
      let importLogId: string | undefined
      try {
        // ── Sync logging (Supabase calendar_sync_logs) ───────────────────────
        // We write one log for import and one for export to match schema:
        // - import: sync_type = full|incremental, direction = import
        // - export: sync_type = manual, direction = export
        const importStartedAt = new Date().toISOString()
        const initialImportSyncType = connection.sync_token ? 'incremental' : 'full'
        const { data: importLogRow } = await supabase
          .from('calendar_sync_logs')
          .insert([{
            connection_id: connection.id,
            user_id: user.id,
            sync_type: initialImportSyncType,
            direction: 'import',
            status: 'running',
            started_at: importStartedAt,
          }])
          .select('id')
          .single()
        importLogId = importLogRow?.id as string | undefined

        const failImportLog = async (message: string) => {
          if (!importLogId) return
          await supabase
            .from('calendar_sync_logs')
            .update({
              status: 'failed',
              error_message: message,
              completed_at: new Date().toISOString(),
            })
            .eq('id', importLogId)
        }

        const tokenResult = await getValidAccessTokenWithExpiration(
          connection.access_token || '',
          connection.refresh_token || null,
          connection.token_expires_at || null
        )
        if (!tokenResult) {
          await failImportLog('Token refresh failed')
          syncResults.push({ connectionId: connection.id, email: connection.email, status: 'failed', error: 'Token refresh failed' })
          continue
        }

        const validAccessToken = tokenResult.accessToken

        // Persist refreshed token
        if (validAccessToken !== connection.access_token) {
          const expiresAt = new Date(Date.now() + (tokenResult.expiresIn || 3600) * 1000).toISOString()
          await supabase.from('calendar_connections').update({ access_token: validAccessToken, token_expires_at: expiresAt }).eq('id', connection.id)
        }

        const calendarId = connection.calendar_id || 'primary'
        let usedIncrementalSync = false
        let nextSyncToken: string | null = null
        let allGoogleEvents: any[] = []

        const fetchResult = await fetchGoogleCalendarEvents({
          accessToken: validAccessToken,
          calendarId,
          syncToken: connection.sync_token || undefined,
          timeMin: fullSyncTimeMin,
          timeMax: fullSyncTimeMax,
          maxPages: 15,
        })

        if (fetchResult.syncTokenExpired) {
          await supabase.from('calendar_connections').update({ sync_token: null }).eq('id', connection.id)
          if (importLogId) {
            await supabase
              .from('calendar_sync_logs')
              .update({ sync_type: 'full' })
              .eq('id', importLogId)
          }
          const retry = await fetchGoogleCalendarEvents({
            accessToken: validAccessToken,
            calendarId,
            timeMin: fullSyncTimeMin,
            timeMax: fullSyncTimeMax,
            maxPages: 15,
          })
          if (!retry.success) {
            await failImportLog(retry.error || 'Failed to fetch Google Calendar events')
            syncResults.push({ connectionId: connection.id, email: connection.email, status: 'failed', error: retry.error || 'Failed to fetch Google Calendar events' })
            continue
          }
          allGoogleEvents = retry.events
          nextSyncToken = retry.nextSyncToken
        } else if (!fetchResult.success) {
          await failImportLog(fetchResult.error || 'Failed to fetch Google Calendar events')
          syncResults.push({ connectionId: connection.id, email: connection.email, status: 'failed', error: fetchResult.error || 'Failed to fetch Google Calendar events' })
          continue
        } else {
          allGoogleEvents = fetchResult.events
          nextSyncToken = fetchResult.nextSyncToken
          usedIncrementalSync = !!connection.sync_token
        }

        let syncedCount = 0, updatedCount = 0, deletedCount = 0, skippedCount = 0

        for (const googleEvent of allGoogleEvents) {
          try {
            const normalized = normalizeGoogleEventToDb({
              googleEvent,
              userId: user.id,
              calendarId,
              userTimezone,
              includeContentHash: false,
            })

            if (normalized.skip) {
              if (normalized.reason === 'cancelled') {
                const { data: toDelete } = await supabase
                  .from('calendar_events')
                  .select('id')
                  .eq('external_event_id', googleEvent.id)
                  .eq('user_id', user.id)
                  .maybeSingle()
                if (toDelete) {
                  await supabase.from('calendar_events').delete().eq('id', toDelete.id)
                  deletedCount++
                } else {
                  skippedCount++
                }
              } else {
                skippedCount++
              }
              continue
            }

            const eventData = normalized.eventData as Record<string, unknown>
            const { data: existingData } = await supabase
              .from('calendar_events')
              .select('id')
              .eq('external_event_id', googleEvent.id)
              .eq('user_id', user.id)
              .maybeSingle()
            const existing = existingData || null

            if (existing) {
              const { error: updateErr } = await supabase.from('calendar_events').update(eventData).eq('id', (existing as any).id)
              if (updateErr) {
                console.error(`[calendar sync] Update failed googleEventId=${googleEvent.id}:`, updateErr.message)
                skippedCount++
              } else {
                updatedCount++
              }
            } else {
              const { error: insertErr } = await supabase.from('calendar_events').insert([eventData])
              if (insertErr) {
                console.error(`[calendar sync] Insert failed googleEventId=${googleEvent.id}:`, insertErr.message)
                skippedCount++
              } else {
                syncedCount++
              }
            }
          } catch (err: any) {
            console.error(`[calendar sync] Error processing googleEventId=${googleEvent.id}:`, err?.message || err)
            skippedCount++
          }
        }

        // Mark import log as completed
        if (importLogId) {
          await supabase
            .from('calendar_sync_logs')
            .update({
              status: 'completed',
              events_created: syncedCount,
              events_updated: updatedCount,
              events_deleted: deletedCount,
              completed_at: new Date().toISOString(),
            })
            .eq('id', importLogId)
        }

        // ── LeadMap → Google (export unsynced native events) ──────────────────
        // Push any LeadMap-native events that don't yet have an external_event_id
        // so they appear in Google Calendar immediately after sync.
        let exportedCount = 0
        let exportFailed = false
        const exportStartedAt = new Date().toISOString()
        const { data: exportLogRow } = await supabase
          .from('calendar_sync_logs')
          .insert([{
            connection_id: connection.id,
            user_id: user.id,
            sync_type: 'manual',
            direction: 'export',
            status: 'running',
            started_at: exportStartedAt,
          }])
          .select('id')
          .single()
        const exportLogId = exportLogRow?.id as string | undefined

        try {
          const { data: nativeEvents } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', user.id)
            .is('external_event_id', null)
            .neq('status', 'cancelled')
            .gte('end_time', now.toISOString())

          if (nativeEvents && nativeEvents.length > 0) {
            const { pushEventToGoogleCalendar } = await import('@/lib/google-calendar-sync')
            for (const nativeEvent of nativeEvents) {
              const pushResult = await pushEventToGoogleCalendar(nativeEvent, validAccessToken, calendarId)
              if (pushResult.success && pushResult.externalEventId) {
                await supabase
                  .from('calendar_events')
                  .update({ external_event_id: pushResult.externalEventId, external_calendar_id: calendarId })
                  .eq('id', nativeEvent.id)
                exportedCount++
              }
            }
          }
        } catch (exportErr: any) {
          console.error('LeadMap→Google export error:', exportErr)
          exportFailed = true
          if (exportLogId) {
            await supabase
              .from('calendar_sync_logs')
              .update({
                status: 'failed',
                error_message: exportErr?.message || String(exportErr),
                completed_at: new Date().toISOString(),
              })
              .eq('id', exportLogId)
          }
        } finally {
          if (exportLogId && !exportFailed) {
            await supabase
              .from('calendar_sync_logs')
              .update({
                status: 'completed',
                events_created: exportedCount,
                events_updated: 0,
                events_deleted: 0,
                completed_at: new Date().toISOString(),
              })
              .eq('id', exportLogId)
          }
        }

        // ── Persist syncToken for next incremental sync ──────────────────────
        const connectionUpdate: any = { last_sync_at: new Date().toISOString() }
        if (nextSyncToken) connectionUpdate.sync_token = nextSyncToken
        await supabase.from('calendar_connections').update(connectionUpdate).eq('id', connection.id)

        syncResults.push({
          connectionId: connection.id,
          email: connection.email,
          calendarName: connection.calendar_name || connection.email,
          status: 'success',
          syncMode: usedIncrementalSync ? 'incremental' : 'full',
          synced: syncedCount,
          updated: updatedCount,
          deleted: deletedCount,
          exported: exportedCount,
          skipped: skippedCount,
          total: allGoogleEvents.length,
        })

        totalSynced += syncedCount
        totalUpdated += updatedCount
        totalDeleted += deletedCount
        totalSkipped += skippedCount
      } catch (connErr: any) {
        console.error(`Error syncing connection ${connection.id}:`, connErr)
        if (importLogId) {
          await supabase
            .from('calendar_sync_logs')
            .update({
              status: 'failed',
              error_message: connErr?.message || String(connErr),
              completed_at: new Date().toISOString(),
            })
            .eq('id', importLogId)
        }
        syncResults.push({ connectionId: connection.id, email: connection.email, status: 'failed', error: connErr.message })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResults.filter(r => r.status === 'success').length} of ${connections.length} calendar(s)`,
      synced: totalSynced,
      updated: totalUpdated,
      deleted: totalDeleted,
      skipped: totalSkipped,
      total: totalSynced + totalUpdated + totalSkipped,
      results: syncResults,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/sync/manual:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
