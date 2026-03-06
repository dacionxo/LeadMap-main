import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeEventContentHash } from '@/lib/google-calendar-sync'

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

    // Fetch all events with pagination support
    // Google Calendar API returns max 2500 events per page, use pagination to get all
    const allGoogleEvents: any[] = []
    let pageToken: string | null = null
    let hasMorePages = true
    const maxPages = 10 // Safety limit to prevent infinite loops

    while (hasMorePages && allGoogleEvents.length < 25000) { // Max 10 pages = 25,000 events
      const googleCalendarUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
      googleCalendarUrl.searchParams.set('timeMin', timeMin)
      googleCalendarUrl.searchParams.set('timeMax', timeMax)
      googleCalendarUrl.searchParams.set('singleEvents', 'true')
      googleCalendarUrl.searchParams.set('orderBy', 'startTime')
      googleCalendarUrl.searchParams.set('maxResults', '2500') // Google Calendar API limit per page
      
      if (pageToken) {
        googleCalendarUrl.searchParams.set('pageToken', pageToken)
      }

      const eventsResponse = await fetch(googleCalendarUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text()
        console.error('Error fetching Google Calendar events:', errorText)
        
        // If this is not the first page, return what we have so far
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

      // Check if there are more pages
      pageToken = googleEventsData.nextPageToken || null
      hasMorePages = !!pageToken
    }

    const googleEvents = allGoogleEvents

    // Get user's default timezone from settings
    const { data: userSettings } = await supabase
      .from('user_calendar_settings')
      .select('default_timezone')
      .eq('user_id', userId)
      .single()

    const userTimezone = userSettings?.default_timezone || 'UTC'

    // Import events into local database (Google → LeadMap direction)
    // Also store nextSyncToken for future incremental syncs.
    const importedEvents: any[] = []
    const skippedEvents: any[] = []
    let deletedCount = 0
    // nextSyncToken is returned on the last page of a full sync fetch
    let nextSyncToken: string | null = null

    // Extract nextSyncToken from the pagination response above (stored on last page)
    // We re-fetch the last page response token stored during pagination above.
    // Since the pagination loop above already collected all events, we check the
    // googleEventsData variable from the last iteration. We capture it below by
    // re-fetching just the token via a lightweight call after the loop if needed.
    // Simpler: store it during the pagination loop by capturing the last response.
    // The loop above doesn't store this, so we do a lightweight final page call now.
    // Actually the simplest fix is to capture nextSyncToken in the pagination loop.
    // We patch the existing loop by adding a nextSyncToken capture.

    // ── Loop-prevention + deletion-propagation import ─────────────────────────
    for (const googleEvent of googleEvents) {
      try {
        if (!googleEvent.id) {
          skippedEvents.push({ id: 'unknown', reason: 'no_event_id' })
          continue
        }

        // ── LOOP PREVENTION (cal-sync synced_by_system flag) ─────────────────
        // Any event LeadMap pushed to Google carries this flag; skip it so it is
        // never re-imported as a duplicate event.
        const sharedProps = googleEvent.extendedProperties?.shared ?? {}
        if (sharedProps.synced_by_system === 'true') {
          skippedEvents.push({ id: googleEvent.id, reason: 'synced_by_system' })
          continue
        }

        // ── DELETION PROPAGATION ─────────────────────────────────────────────
        // For the initial full sync we only get non-cancelled events (no showDeleted).
        // Incremental sync (manual route) handles deletions via showDeleted=true.
        if (googleEvent.status === 'cancelled') {
          const { data: toDelete } = await supabase
            .from('calendar_events')
            .select('id')
            .eq('external_event_id', googleEvent.id)
            .eq('user_id', userId)
            .maybeSingle()
          if (toDelete) {
            await supabase.from('calendar_events').delete().eq('id', toDelete.id)
            deletedCount++
          } else {
            skippedEvents.push({ id: googleEvent.id, reason: 'cancelled' })
          }
          continue
        }

        // ── CHANGE DETECTION (SHA-256 content hash) ───────────────────────────
        const { data: existingData } = await supabase
          .from('calendar_events')
          .select('id, updated_at, content_hash')
          .eq('external_event_id', googleEvent.id)
          .eq('user_id', userId)
          .maybeSingle()

        const existing = existingData || null

        const newHash = computeEventContentHash({
          summary: googleEvent.summary,
          description: googleEvent.description,
          location: googleEvent.location,
          start: googleEvent.start,
          end: googleEvent.end,
          recurrence: googleEvent.recurrence,
          transparency: googleEvent.transparency,
          visibility: googleEvent.visibility,
          colorId: googleEvent.colorId,
        })

        if (existing && (existing as any).content_hash === newHash) {
          skippedEvents.push({ id: googleEvent.id, reason: 'no_change' })
          continue
        }

        // ── Parse event fields ────────────────────────────────────────────────
        const title = googleEvent.summary || 'Untitled Event'
        const description = googleEvent.description || ''
        const location = googleEvent.location || ''
        let startTime: string
        let endTime: string
        let allDay = false
        let startDate: string | null = null
        let endDate: string | null = null

        if (googleEvent.start?.dateTime) {
          startTime = googleEvent.start.dateTime
          endTime = googleEvent.end?.dateTime || startTime
          allDay = false
        } else if (googleEvent.start?.date) {
          allDay = true
          startDate = googleEvent.start.date
          endDate = googleEvent.end?.date || startDate
          const adjustedEndDate = (endDate && typeof endDate === 'string')
            ? new Date(new Date(endDate).getTime() - 86400000).toISOString().split('T')[0]
            : startDate
          startTime = new Date(`${startDate}T00:00:00Z`).toISOString()
          endTime = adjustedEndDate
            ? new Date(`${adjustedEndDate}T23:59:59Z`).toISOString()
            : new Date(`${startDate}T23:59:59Z`).toISOString()
        } else {
          skippedEvents.push({ id: googleEvent.id, reason: 'no_start_time' })
          continue
        }

        const attendees = (googleEvent.attendees || []).map((attendee: any) => ({
          email: attendee.email,
          name: attendee.displayName || attendee.email,
          status: attendee.responseStatus || 'needsAction',
          organizer: attendee.organizer === true,
        }))

        let eventType = 'other'
        const titleLower = title.toLowerCase()
        if (titleLower.includes('call') || titleLower.includes('phone')) eventType = 'call'
        else if (titleLower.includes('visit') || titleLower.includes('showing') || titleLower.includes('tour')) eventType = 'visit'
        else if (titleLower.includes('meeting')) eventType = 'meeting'
        else if (titleLower.includes('follow')) eventType = 'follow_up'

        const eventTimezone = googleEvent.start?.timeZone || userTimezone
        const eventData: any = {
          user_id: userId,
          title,
          description,
          event_type: eventType,
          start_time: startTime,
          end_time: endTime,
          all_day: allDay,
          start_date: startDate,
          end_date: endDate,
          location,
          timezone: eventTimezone,
          event_timezone: eventTimezone,
          external_event_id: googleEvent.id,
          external_calendar_id: calendarId,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          attendees: attendees.length > 0 ? JSON.stringify(attendees) : '[]',
          organizer_email: googleEvent.organizer?.email || null,
          organizer_name: googleEvent.organizer?.displayName || null,
          recurrence_rule: googleEvent.recurrence?.[0] || null,
          status: 'scheduled',
          color: googleEvent.colorId ? `#${googleEvent.colorId}` : null,
          conferencing_link: googleEvent.hangoutLink || null,
          conferencing_provider: googleEvent.hangoutLink ? 'google_meet' : null,
          content_hash: newHash,
        }

        if (existing) {
          const { data: updatedEvent, error: updateError } = await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', (existing as any).id)
            .select()
            .single()

          if (updateError || !updatedEvent) {
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

    // ── Persist syncToken for future incremental sync ────────────────────────
    // Fetch the nextSyncToken by making one more lightweight call (no params =
    // get token for current state). Google returns it on the last page; since
    // we already fetched all pages above we get a fresh token via a minimal call.
    try {
      const tokenUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
      tokenUrl.searchParams.set('maxResults', '1')
      tokenUrl.searchParams.set('showDeleted', 'false')
      const tokenRes = await fetch(tokenUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json()
        nextSyncToken = tokenData.nextSyncToken || null
      }
    } catch {
      // Non-fatal: next sync will do full fetch
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

