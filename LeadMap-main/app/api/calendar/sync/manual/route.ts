import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessTokenWithExpiration, computeEventContentHash } from '@/lib/google-calendar-sync'

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

    // Full sync window (used when no syncToken is available)
    const now = new Date()
    const fullSyncTimeMin = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const fullSyncTimeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const syncResults: any[] = []
    let totalSynced = 0, totalUpdated = 0, totalDeleted = 0, totalSkipped = 0

    for (const connection of connections) {
      try {
        const tokenResult = await getValidAccessTokenWithExpiration(
          connection.access_token || '',
          connection.refresh_token || null,
          connection.token_expires_at || null
        )
        if (!tokenResult) {
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

        // ── Fetch Google Calendar events ───────────────────────────────────────
        // Use stored syncToken for incremental sync; fall back to full on 410 Gone.
        const allGoogleEvents: any[] = []

        const fetchPages = async (useIncremental: boolean): Promise<{ success: boolean; syncTokenExpired?: boolean }> => {
          let pageToken: string | null = null
          let pageCount = 0
          const maxPages = 10

          while (pageCount < maxPages) {
            pageCount++
            const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)

            if (useIncremental && connection.sync_token) {
              // Incremental: syncToken replaces timeMin/timeMax.
              // showDeleted=true so we get cancelled events for deletion propagation.
              url.searchParams.set('syncToken', connection.sync_token)
              url.searchParams.set('showDeleted', 'true')
              url.searchParams.set('singleEvents', 'true')
              url.searchParams.set('maxResults', '2500')
            } else {
              // Full sync: time-range based
              url.searchParams.set('timeMin', fullSyncTimeMin)
              url.searchParams.set('timeMax', fullSyncTimeMax)
              url.searchParams.set('singleEvents', 'true')
              url.searchParams.set('orderBy', 'startTime')
              url.searchParams.set('maxResults', '2500')
            }

            if (pageToken) url.searchParams.set('pageToken', pageToken)

            const res = await fetch(url.toString(), {
              headers: { Authorization: `Bearer ${validAccessToken}` },
            })

            if (!res.ok) {
              if (res.status === 410) return { success: false, syncTokenExpired: true }
              const errText = await res.text()
              console.error(`Google Calendar fetch error (${connection.email}):`, errText)
              return { success: false }
            }

            const data = await res.json()
            allGoogleEvents.push(...(data.items || []))

            // Save the sync token from the final page
            if (data.nextSyncToken) nextSyncToken = data.nextSyncToken
            pageToken = data.nextPageToken || null
            if (!pageToken) break
          }
          return { success: true }
        }

        // Try incremental first if we have a sync token
        const hasStoredToken = !!connection.sync_token
        let result = hasStoredToken ? await fetchPages(true) : { success: false }

        if (!result.success) {
          // Fall back to full sync (either first run or 410 syncToken expired)
          if (result.syncTokenExpired) {
            console.log(`Sync token expired for ${connection.email}, doing full sync`)
            await supabase.from('calendar_connections').update({ sync_token: null }).eq('id', connection.id)
          }
          allGoogleEvents.length = 0 // clear any partial results
          result = await fetchPages(false)
          usedIncrementalSync = false
          if (!result.success) {
            syncResults.push({ connectionId: connection.id, email: connection.email, status: 'failed', error: 'Failed to fetch Google Calendar events' })
            continue
          }
        } else {
          usedIncrementalSync = hasStoredToken
        }

        // ── Process events ─────────────────────────────────────────────────────
        let syncedCount = 0, updatedCount = 0, deletedCount = 0, skippedCount = 0

        for (const googleEvent of allGoogleEvents) {
          try {
            if (!googleEvent.id) { skippedCount++; continue }

            // ── LOOP PREVENTION (cal-sync approach) ──────────────────────────
            // Skip any event that LeadMap itself pushed to Google Calendar.
            // These carry extendedProperties.shared.synced_by_system = "true".
            const sharedProps = googleEvent.extendedProperties?.shared ?? {}
            if (sharedProps.synced_by_system === 'true') {
              skippedCount++
              continue
            }

            // ── DELETION PROPAGATION ─────────────────────────────────────────
            // Incremental sync returns cancelled events so we can delete locally.
            if (googleEvent.status === 'cancelled') {
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
              continue
            }

            // ── UPSERT (create / update) ──────────────────────────────────────
            const { data: existingData } = await supabase
              .from('calendar_events')
              .select('id, updated_at, content_hash')
              .eq('external_event_id', googleEvent.id)
              .eq('user_id', user.id)
              .maybeSingle()

            const existing = existingData || null

            // Content-hash change detection (cal-sync compute_content_hash approach)
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
              skippedCount++
              continue
            }

            // Parse times
            const title = googleEvent.summary || 'Untitled Event'
            const description = googleEvent.description || ''
            const location = googleEvent.location || ''
            let startTime: string, endTime: string, allDay = false
            let startDate: string | null = null, endDate: string | null = null
            const eventTimezone = googleEvent.start?.timeZone || userTimezone

            if (googleEvent.start?.dateTime) {
              startTime = googleEvent.start.dateTime
              endTime = googleEvent.end?.dateTime || startTime
            } else if (googleEvent.start?.date) {
              allDay = true
              startDate = googleEvent.start.date
              const rawEnd = googleEvent.end?.date || googleEvent.start.date
              const adjustedEnd = new Date(new Date(rawEnd).getTime() - 86400000).toISOString().split('T')[0]
              endDate = adjustedEnd
              startTime = new Date(`${startDate}T00:00:00Z`).toISOString()
              endTime = new Date(`${adjustedEnd}T23:59:59Z`).toISOString()
            } else {
              skippedCount++
              continue
            }

            // Determine event type heuristically
            let eventType = 'other'
            const tl = title.toLowerCase()
            if (tl.includes('call') || tl.includes('phone')) eventType = 'call'
            else if (tl.includes('visit') || tl.includes('showing') || tl.includes('tour')) eventType = 'visit'
            else if (tl.includes('meeting')) eventType = 'meeting'
            else if (tl.includes('follow')) eventType = 'follow_up'

            const attendees = (googleEvent.attendees || []).map((a: any) => ({
              email: a.email,
              name: a.displayName || a.email,
              status: a.responseStatus || 'needsAction',
              organizer: a.organizer === true,
            }))

            const eventData: any = {
              user_id: user.id,
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
              conferencing_link: googleEvent.hangoutLink || googleEvent.location?.startsWith('http') ? (googleEvent.hangoutLink || googleEvent.location) : null,
              conferencing_provider: googleEvent.hangoutLink ? 'google_meet' : null,
              content_hash: newHash,
            }

            if (existing) {
              await supabase.from('calendar_events').update(eventData).eq('id', (existing as any).id)
              updatedCount++
            } else {
              await supabase.from('calendar_events').insert([eventData])
              syncedCount++
            }
          } catch (err: any) {
            console.error(`Error processing event ${googleEvent.id}:`, err)
            skippedCount++
          }
        }

        // ── LeadMap → Google (export unsynced native events) ──────────────────
        // Push any LeadMap-native events that don't yet have an external_event_id
        // so they appear in Google Calendar immediately after sync.
        let exportedCount = 0
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
