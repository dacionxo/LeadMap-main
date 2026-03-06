import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeGoogleEventToDb } from '@/lib/calendar-import'

export const runtime = 'nodejs'

/**
 * POST /api/calendar/sync/google
 * Sync events from Google Calendar to local database
 * This is called after OAuth connection to import existing events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, connectionId, accessToken, calendarId } = body

    if (!userId || !connectionId || !accessToken || !calendarId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch events from Google Calendar
    // Get events from the past 3 months and next 12 months
    const now = new Date()
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const twelveMonthsFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    const timeMin = threeMonthsAgo.toISOString()
    const timeMax = twelveMonthsFromNow.toISOString()

    // Fetch all events with pagination; capture nextSyncToken from last page (cal-sync: use for incremental later)
    const allGoogleEvents: any[] = []
    let pageToken: string | null = null
    let nextSyncToken: string | null = null

    while (true) {
      const googleCalendarUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
      googleCalendarUrl.searchParams.set('timeMin', timeMin)
      googleCalendarUrl.searchParams.set('timeMax', timeMax)
      googleCalendarUrl.searchParams.set('singleEvents', 'true')
      googleCalendarUrl.searchParams.set('orderBy', 'startTime')
      googleCalendarUrl.searchParams.set('maxResults', '2500')

      if (pageToken) googleCalendarUrl.searchParams.set('pageToken', pageToken)

      const eventsResponse = await fetch(googleCalendarUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text()
        console.error('Error fetching Google Calendar events:', errorText)
        if (allGoogleEvents.length > 0) {
          console.warn(`Fetched ${allGoogleEvents.length} events before pagination error`)
          break
        }
        return NextResponse.json(
          { error: 'Failed to fetch events from Google Calendar', details: errorText },
          { status: 500 }
        )
      }

      const googleEventsData = await eventsResponse.json()
      const pageEvents = googleEventsData.items || []
      allGoogleEvents.push(...pageEvents)
      if (googleEventsData.nextSyncToken) nextSyncToken = googleEventsData.nextSyncToken
      pageToken = googleEventsData.nextPageToken || null
      if (!pageToken) break
    }

    const googleEvents = allGoogleEvents

    // Get user's default timezone from settings
    const { data: userSettings } = await supabase
      .from('user_calendar_settings')
      .select('default_timezone')
      .eq('user_id', userId)
      .single()

    const userTimezone = userSettings?.default_timezone || 'UTC'

    const importedEvents: any[] = []
    const skippedEvents: any[] = []
    let deletedCount = 0

    for (const googleEvent of googleEvents) {
      try {
        const normalized = normalizeGoogleEventToDb({
          googleEvent,
          userId,
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
              .eq('user_id', userId)
              .maybeSingle()
            if (toDelete) {
              await supabase.from('calendar_events').delete().eq('id', toDelete.id)
              deletedCount++
            }
          }
          skippedEvents.push({ id: googleEvent.id || 'unknown', reason: normalized.reason })
          continue
        }

        const eventData = normalized.eventData as Record<string, unknown>
        const { data: existingData } = await supabase
          .from('calendar_events')
          .select('id, updated_at')
          .eq('external_event_id', googleEvent.id)
          .eq('user_id', userId)
          .maybeSingle()

        const existing = existingData || null

        if (existing) {
          const { data: updatedEvent, error: updateError } = await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', (existing as any).id)
            .select()
            .single()

          if (updateError || !updatedEvent) {
            console.error(`[calendar sync] Update failed for googleEventId=${googleEvent.id}:`, updateError?.message || updateError)
            skippedEvents.push({ id: googleEvent.id, reason: 'update_error', error: updateError?.message })
            continue
          }
          importedEvents.push({ id: updatedEvent.id, title: updatedEvent.title, external_id: googleEvent.id })
        } else {
          const { data: newEvent, error: insertError } = await supabase
            .from('calendar_events')
            .insert([eventData])
            .select()
            .single()

          if (insertError || !newEvent) {
            console.error(`[calendar sync] Insert failed for googleEventId=${googleEvent.id}:`, insertError?.message || insertError)
            skippedEvents.push({ id: googleEvent.id, reason: 'insert_error', error: insertError?.message })
            continue
          }
          importedEvents.push({ id: newEvent.id, title: newEvent.title, external_id: googleEvent.id })
        }
      } catch (error: any) {
        console.error(`Error processing Google event ${googleEvent.id}:`, error)
        skippedEvents.push({ id: googleEvent.id, reason: 'processing_error', error: error.message })
      }
    }

    await supabase
      .from('calendar_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        ...(nextSyncToken ? { sync_token: nextSyncToken } : {}),
      })
      .eq('id', connectionId)

    return NextResponse.json({
      success: true,
      imported: importedEvents.length,
      deleted: deletedCount,
      skipped: skippedEvents.length,
      importedEvents: importedEvents.slice(0, 10),
      skippedEvents: skippedEvents.slice(0, 10),
    })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/sync/google:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

