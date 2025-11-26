import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/calendar/events
 * Fetch calendar events for the authenticated user
 * 
 * All times are stored and returned in UTC (ISO 8601 format).
 * The frontend is responsible for converting to the user's timezone for display.
 * 
 * Query params:
 * - start: ISO date string (start of range) in UTC
 * - end: ISO date string (end of range) in UTC
 * - eventType: Filter by event type
 * - relatedType: Filter by related entity type
 * - relatedId: Filter by related entity ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const eventType = searchParams.get('eventType')
    const relatedType = searchParams.get('relatedType')
    const relatedId = searchParams.get('relatedId')

    // Authenticate user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role for queries
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

    // Get user settings to check show_declined_events
    const { data: userSettings } = await supabase
      .from('user_calendar_settings')
      .select('show_declined_events, default_timezone')
      .eq('user_id', user.id)
      .single()

    // Query timed events (non-all-day)
    let timedQuery = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('all_day', false)
      .neq('status', 'cancelled')

    // Apply time range filters for timed events (using UTC)
    if (start) {
      timedQuery = timedQuery.gte('end_time', start)
    }
    if (end) {
      timedQuery = timedQuery.lte('start_time', end)
    }
    if (eventType) {
      timedQuery = timedQuery.eq('event_type', eventType)
    }
    if (relatedType) {
      timedQuery = timedQuery.eq('related_type', relatedType)
    }
    if (relatedId) {
      timedQuery = timedQuery.eq('related_id', relatedId)
    }
    if (userSettings?.show_declined_events === false) {
      timedQuery = timedQuery.neq('status', 'declined')
    }

    // Query all-day events separately (using date-only comparison)
    let allDayQuery = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('all_day', true)
      .neq('status', 'cancelled')

    // For all-day events, compare dates only (no timezone conversion)
    if (start) {
      const startDate = start.split('T')[0]
      allDayQuery = allDayQuery.or(`end_date.gte.${startDate},end_time.gte.${start}`)
    }
    if (end) {
      const endDate = end.split('T')[0]
      allDayQuery = allDayQuery.or(`start_date.lte.${endDate},start_time.lte.${end}`)
    }
    if (eventType) {
      allDayQuery = allDayQuery.eq('event_type', eventType)
    }
    if (relatedType) {
      allDayQuery = allDayQuery.eq('related_type', relatedType)
    }
    if (relatedId) {
      allDayQuery = allDayQuery.eq('related_id', relatedId)
    }
    if (userSettings?.show_declined_events === false) {
      allDayQuery = allDayQuery.neq('status', 'declined')
    }

    // Execute both queries
    const [timedResult, allDayResult] = await Promise.all([
      timedQuery.order('start_time', { ascending: true }),
      allDayQuery.order('start_date', { ascending: true }),
    ])

    if (timedResult.error) {
      console.error('Error fetching timed events:', timedResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    if (allDayResult.error) {
      console.error('Error fetching all-day events:', allDayResult.error)
      // Don't fail entirely, just return timed events
    }

    // Combine and return events
    // All times are already in UTC from Supabase (TIMESTAMPTZ)
    const events = [
      ...(timedResult.data || []),
      ...(allDayResult.data || []),
    ]

    // Include user's default timezone in response for frontend convenience
    return NextResponse.json({ 
      events,
      userTimezone: userSettings?.default_timezone || 'UTC',
    })
  } catch (error) {
    console.error('Error in GET /api/calendar/events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/calendar/events
 * Create a new calendar event
 * 
 * Time handling:
 * - Frontend sends times in user's timezone (datetime-local format: "YYYY-MM-DDTHH:MM")
 * - Backend converts user's timezone → UTC before saving
 * - For all-day events, provide startDate and endDate (date-only, no timezone conversion)
 * - The eventTimezone field stores the user's timezone for display purposes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      eventType,
      // Timed events: datetime-local format in user's timezone (e.g., "2023-12-01T14:00")
      startTime,
      endTime,
      // All-day events: date-only strings (YYYY-MM-DD)
      startDate,
      endDate,
      // Timezone: user's selected timezone (e.g., "America/New_York")
      timezone,
      eventTimezone,
      recurrenceTimezone,
      allDay,
      location,
      conferencingLink,
      conferencingProvider,
      recurrenceRule,
      recurrenceEndDate,
      relatedType,
      relatedId,
      attendees,
      organizerEmail,
      organizerName,
      color,
      notes,
      tags,
      reminderMinutes,
      followUpEnabled,
      followUpDelayHours,
    } = body

    // Authenticate user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields based on event type
    if (!title || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, eventType' },
        { status: 400 }
      )
    }

    // Validate time/date fields based on all_day flag
    const isAllDay = allDay || false
    const userTimezone = timezone || 'UTC' // User's timezone for conversion
    
    if (isAllDay) {
      // All-day events need dates OR times (for backwards compatibility)
      if (!startDate && !startTime) {
        return NextResponse.json(
          { error: 'All-day events require startDate or startTime' },
          { status: 400 }
        )
      }
    } else {
      // Timed events need times in user's timezone
      if (!startTime || !endTime) {
        return NextResponse.json(
          { error: 'Timed events require startTime and endTime' },
          { status: 400 }
        )
      }
    }

    // Use service role for queries
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

    // Build event data
    // For all-day events: use start_date/end_date, set times to null
    // For timed events: use start_time/end_time (must be UTC), dates are null
    const eventData: Record<string, any> = {
      user_id: user.id,
      title,
      description: description || null,
      event_type: eventType,
      all_day: isAllDay,
      location: location || null,
      conferencing_link: conferencingLink || null,
      conferencing_provider: conferencingProvider || null,
      recurrence_rule: recurrenceRule || null,
      recurrence_end_date: recurrenceEndDate || null,
      recurrence_timezone: recurrenceTimezone || eventTimezone || timezone || null,
      related_type: relatedType || null,
      related_id: relatedId || null,
      attendees: attendees ? JSON.stringify(attendees) : '[]',
      organizer_email: organizerEmail || user.email || null,
      organizer_name: organizerName || null,
      color: color || null,
      notes: notes || null,
      tags: tags || null,
      reminder_minutes: reminderMinutes || null,
      follow_up_enabled: followUpEnabled || false,
      follow_up_delay_hours: followUpDelayHours || null,
      // Event-specific timezone override
      event_timezone: eventTimezone || null,
      // Legacy field (kept for backwards compatibility)
      timezone: timezone || 'UTC',
    }

    if (isAllDay) {
      // All-day events: store dates only (no timezone conversion)
      // If dates are provided, use them; otherwise extract from times
      if (startDate && endDate) {
        eventData.start_date = startDate
        eventData.end_date = endDate
        eventData.start_time = null
        eventData.end_time = null
      } else if (startTime && endTime) {
        // Backwards compatibility: extract dates from times
        eventData.start_date = startTime.split('T')[0]
        eventData.end_date = endTime.split('T')[0]
        eventData.start_time = startTime // Keep for backwards compatibility
        eventData.end_time = endTime
      }
    } else {
      // Timed events: Convert from user's timezone to UTC
      // startTime/endTime are in datetime-local format (YYYY-MM-DDTHH:MM) in user's timezone
      // We need to convert them to UTC for storage
      
      const convertToUtc = (dateTimeLocal: string, tz: string): string => {
        if (!dateTimeLocal) return ''
        
        // Parse datetime-local input
        const [datePart, timePart] = dateTimeLocal.split('T')
        const [year, month, day] = datePart.split('-').map(Number)
        const [hours, minutes] = (timePart || '00:00').split(':').map(Number)
        
        // Find UTC time that displays as this time in the user's timezone
        let utcEstimate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        
        // Iteratively adjust until we get the correct UTC time
        for (let i = 0; i < 10; i++) {
          const parts = formatter.formatToParts(utcEstimate)
          const displayedYear = parseInt(parts.find(p => p.type === 'year')?.value || '0')
          const displayedMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0')
          const displayedDay = parseInt(parts.find(p => p.type === 'day')?.value || '0')
          const displayedHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
          const displayedMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
          
          if (displayedYear === year && 
              displayedMonth === month && 
              displayedDay === day && 
              displayedHour === hours && 
              displayedMinute === minutes) {
            break
          }
          
          const dayDiff = displayedDay - day
          const hourDiff = displayedHour - hours
          const minuteDiff = displayedMinute - minutes
          const totalMinutesDiff = (dayDiff * 24 * 60) + (hourDiff * 60) + minuteDiff
          
          utcEstimate = new Date(utcEstimate.getTime() - totalMinutesDiff * 60 * 1000)
          
          if (Math.abs(totalMinutesDiff) < 1) break
        }
        
        return utcEstimate.toISOString()
      }
      
      const startTimeUtc = convertToUtc(startTime, userTimezone)
      const endTimeUtc = convertToUtc(endTime, userTimezone)
      
      // Validate conversion
      const startDateObj = new Date(startTimeUtc)
      const endDateObj = new Date(endTimeUtc)
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Failed to convert times from user timezone to UTC' },
          { status: 400 }
        )
      }
      
      eventData.start_time = startDateObj.toISOString()
      eventData.end_time = endDateObj.toISOString()
      eventData.start_date = null
      eventData.end_date = null
    }

    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select()
      .single()

    if (error) {
      console.error('Error creating calendar event:', error)
      return NextResponse.json(
        { error: 'Failed to create event', details: error.message },
        { status: 500 }
      )
    }

    // Create reminders if specified (only for timed events)
    if (!isAllDay && reminderMinutes && Array.isArray(reminderMinutes) && reminderMinutes.length > 0) {
      const reminders = reminderMinutes.map((minutes: number) => {
        const reminderTime = new Date(event.start_time)
        reminderTime.setMinutes(reminderTime.getMinutes() - minutes)
        
        return {
          event_id: event.id,
          user_id: user.id,
          reminder_minutes: minutes,
          reminder_time: reminderTime.toISOString(), // Always UTC
          status: 'pending',
        }
      })

      await supabase
        .from('calendar_reminders')
        .insert(reminders)
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/calendar/events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

