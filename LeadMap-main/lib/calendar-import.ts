/**
 * Calendar import: fetch from Google Calendar API and normalize to DB shape.
 * Reference: cal-sync (sync_engine, content_hash, loop prevention), google_calendar_oauth2 (event shape).
 *
 * - Fetch supports full (timeMin/timeMax) and incremental (syncToken) with pagination and 410 handling.
 * - Normalize applies loop prevention (synced_by_system), parses start/end (timed + all-day), builds eventData.
 */

import { computeEventContentHash } from './google-calendar-sync'

export interface FetchEventsOptions {
  accessToken: string
  calendarId: string
  /** For incremental sync; when set, timeMin/timeMax are ignored */
  syncToken?: string | null
  timeMin?: string
  timeMax?: string
  maxPages?: number
}

export interface FetchEventsResult {
  success: boolean
  events: any[]
  nextSyncToken: string | null
  syncTokenExpired?: boolean
  error?: string
}

/**
 * Fetch events from Google Calendar API with pagination.
 * Uses syncToken for incremental (showDeleted=true) or timeMin/timeMax for full sync.
 * On 410, returns syncTokenExpired so caller can clear token and retry with full sync.
 */
export async function fetchGoogleCalendarEvents(
  options: FetchEventsOptions
): Promise<FetchEventsResult> {
  const {
    accessToken,
    calendarId,
    syncToken = null,
    timeMin,
    timeMax,
    maxPages = 15,
  } = options

  const events: any[] = []
  let nextSyncToken: string | null = null
  let pageToken: string | null = null
  let pageCount = 0

  const useIncremental = !!syncToken

  while (pageCount < maxPages) {
    pageCount++
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    )

    if (useIncremental) {
      url.searchParams.set('syncToken', syncToken!)
      url.searchParams.set('showDeleted', 'true')
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('maxResults', '2500')
    } else {
      if (timeMin) url.searchParams.set('timeMin', timeMin)
      if (timeMax) url.searchParams.set('timeMax', timeMax)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('maxResults', '2500')
    }
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      if (res.status === 410) {
        return {
          success: false,
          events: [],
          nextSyncToken: null,
          syncTokenExpired: true,
          error: 'Sync token expired (410)',
        }
      }
      const errText = await res.text()
      return {
        success: false,
        events: [],
        nextSyncToken: null,
        error: errText || `HTTP ${res.status}`,
      }
    }

    const data = await res.json()
    events.push(...(data.items || []))
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken
    pageToken = data.nextPageToken || null
    if (!pageToken) break
  }

  return {
    success: true,
    events,
    nextSyncToken,
  }
}

/** Loop prevention: skip events that LeadMap pushed to Google (cal-sync synced_by_system). */
export function isSyncedBySystem(googleEvent: any): boolean {
  const shared = googleEvent?.extendedProperties?.shared ?? {}
  return shared.synced_by_system === 'true'
}

export interface NormalizeEventInput {
  googleEvent: any
  userId: string
  calendarId: string
  userTimezone: string
  /** If true, include content_hash in the returned object (requires add_bidirectional_sync_improvements migration). */
  includeContentHash?: boolean
}

export type NormalizeEventResult =
  | { skip: true; reason: 'synced_by_system' | 'cancelled' | 'no_id' | 'no_start_time' }
  | { skip: false; eventData: Record<string, any>; contentHash?: string }

/**
 * Normalize a Google Calendar event to calendar_events row shape.
 * Returns skip: true with reason for loop-prevention, cancelled, or invalid; otherwise eventData for upsert.
 */
export function normalizeGoogleEventToDb(input: NormalizeEventInput): NormalizeEventResult {
  const { googleEvent, userId, calendarId, userTimezone, includeContentHash = false } = input

  if (!googleEvent?.id) {
    return { skip: true, reason: 'no_id' }
  }
  if (isSyncedBySystem(googleEvent)) {
    return { skip: true, reason: 'synced_by_system' }
  }
  if (googleEvent.status === 'cancelled') {
    return { skip: true, reason: 'cancelled' }
  }

  const title = googleEvent.summary || 'Untitled Event'
  const description = googleEvent.description ?? ''
  const location = googleEvent.location ?? ''
  let startTime: string
  let endTime: string
  let allDay = false
  let startDate: string | null = null
  let endDate: string | null = null
  const eventTimezone = googleEvent.start?.timeZone || userTimezone

  if (googleEvent.start?.dateTime) {
    startTime = googleEvent.start.dateTime
    endTime = googleEvent.end?.dateTime || startTime
    allDay = false
  } else if (googleEvent.start?.date) {
    allDay = true
    startDate = googleEvent.start.date
    const rawEnd = googleEvent.end?.date || googleEvent.start.date
    // Google uses exclusive end date for all-day; store inclusive last day (cal-sync / ical)
    const adjustedEnd = new Date(new Date(rawEnd).getTime() - 86400000).toISOString().split('T')[0]
    endDate = adjustedEnd
    startTime = new Date(`${startDate}T00:00:00Z`).toISOString()
    endTime = new Date(`${adjustedEnd}T23:59:59Z`).toISOString()
  } else {
    return { skip: true, reason: 'no_start_time' }
  }

  const attendees = (googleEvent.attendees || []).map((a: any) => ({
    email: a.email,
    name: a.displayName || a.email,
    status: a.responseStatus || 'needsAction',
    organizer: a.organizer === true,
  }))

  let eventType = 'other'
  const tl = title.toLowerCase()
  if (tl.includes('call') || tl.includes('phone')) eventType = 'call'
  else if (tl.includes('visit') || tl.includes('showing') || tl.includes('tour')) eventType = 'visit'
  else if (tl.includes('meeting')) eventType = 'meeting'
  else if (tl.includes('follow')) eventType = 'follow_up'

  const eventData: Record<string, any> = {
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
    organizer_email: googleEvent.organizer?.email ?? null,
    organizer_name: googleEvent.organizer?.displayName ?? null,
    recurrence_rule: googleEvent.recurrence?.[0] ?? null,
    status: 'scheduled',
    color: googleEvent.colorId ? `#${googleEvent.colorId}` : null,
    conferencing_link: (googleEvent.hangoutLink || (googleEvent.location?.startsWith?.('http') ? googleEvent.location : null)) ?? null,
    conferencing_provider: googleEvent.hangoutLink ? 'google_meet' : null,
  }

  if (includeContentHash) {
    const contentHash = computeEventContentHash({
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
    eventData.content_hash = contentHash
  }

  return { skip: false, eventData }
}

/**
 * Get primary calendar id and summary from CalendarList (cal-sync style).
 * Falls back to calendarId "primary" and email if list fails.
 */
export async function getPrimaryCalendarInfo(
  accessToken: string,
  fallbackEmail: string
): Promise<{ calendarId: string; calendarName: string }> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=owner&maxResults=250',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) {
      return { calendarId: 'primary', calendarName: fallbackEmail }
    }
    const data = await res.json()
    const items = data.items || []
    const primary = items.find((c: any) => c.primary === true)
    if (primary) {
      return {
        calendarId: primary.id,
        calendarName: primary.summary || fallbackEmail,
      }
    }
    if (items.length > 0) {
      return {
        calendarId: items[0].id,
        calendarName: items[0].summary || fallbackEmail,
      }
    }
  } catch {
    // ignore
  }
  return { calendarId: 'primary', calendarName: fallbackEmail }
}
