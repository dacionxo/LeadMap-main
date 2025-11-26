import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken, pushEventToGoogleCalendar, deleteEventFromGoogleCalendar } from '@/lib/google-calendar-sync'

export const runtime = 'nodejs'

/**
 * GET /api/calendar/events/[eventId]
 * Get a specific calendar event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

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

    const { data: event, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error in GET /api/calendar/events/[eventId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/calendar/events/[eventId]
 * Update a calendar event
 * 
 * Time handling:
 * - Frontend sends times in user's timezone (datetime-local format: "YYYY-MM-DDTHH:MM")
 * - Backend converts user's timezone → UTC before saving
 * - For all-day events, provide startDate and endDate (date-only, no timezone conversion)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()

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

    // Verify event exists and belongs to user
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get user's timezone for conversion
    const userTimezone = body.timezone || existingEvent.timezone || 'UTC'

    // Helper function to convert datetime-local to UTC
    const convertToUtc = (dateTimeLocal: string, tz: string): string => {
      if (!dateTimeLocal) return ''
      
      const [datePart, timePart] = dateTimeLocal.split('T')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hours, minutes] = (timePart || '00:00').split(':').map(Number)
      
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

    // Prepare update data (only include provided fields)
    const updateData: Record<string, any> = {}
    
    // Basic fields
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.eventType !== undefined) updateData.event_type = body.eventType
    if (body.location !== undefined) updateData.location = body.location
    if (body.conferencingLink !== undefined) updateData.conferencing_link = body.conferencingLink
    if (body.conferencingProvider !== undefined) updateData.conferencing_provider = body.conferencingProvider
    if (body.relatedType !== undefined) updateData.related_type = body.relatedType
    if (body.relatedId !== undefined) updateData.related_id = body.relatedId
    if (body.attendees !== undefined) updateData.attendees = JSON.stringify(body.attendees)
    if (body.status !== undefined) updateData.status = body.status
    if (body.color !== undefined) updateData.color = body.color
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.reminderMinutes !== undefined) updateData.reminder_minutes = body.reminderMinutes
    if (body.followUpEnabled !== undefined) updateData.follow_up_enabled = body.followUpEnabled
    if (body.followUpDelayHours !== undefined) updateData.follow_up_delay_hours = body.followUpDelayHours
    
    // Recurrence fields
    if (body.recurrenceRule !== undefined) updateData.recurrence_rule = body.recurrenceRule
    if (body.recurrenceEndDate !== undefined) updateData.recurrence_end_date = body.recurrenceEndDate
    if (body.recurrenceTimezone !== undefined) updateData.recurrence_timezone = body.recurrenceTimezone
    
    // Timezone fields
    if (body.eventTimezone !== undefined) updateData.event_timezone = body.eventTimezone
    if (body.timezone !== undefined) updateData.timezone = body.timezone

    // Handle all_day flag change
    const isAllDay = body.allDay !== undefined ? body.allDay : existingEvent.all_day
    if (body.allDay !== undefined) updateData.all_day = body.allDay

    // Handle time/date fields based on all_day status
    if (isAllDay) {
      // All-day events: use dates only
      if (body.startDate !== undefined) {
        updateData.start_date = body.startDate
        updateData.start_time = null
      } else if (body.startTime !== undefined) {
        updateData.start_date = body.startTime.split('T')[0]
        updateData.start_time = null
      }
      
      if (body.endDate !== undefined) {
        updateData.end_date = body.endDate
        updateData.end_time = null
      } else if (body.endTime !== undefined) {
        updateData.end_date = body.endTime.split('T')[0]
        updateData.end_time = null
      }
    } else {
      // Timed events: Convert from user's timezone to UTC
      if (body.startTime !== undefined) {
        const startTimeUtc = convertToUtc(body.startTime, userTimezone)
        const startDateObj = new Date(startTimeUtc)
        if (isNaN(startDateObj.getTime())) {
          return NextResponse.json(
            { error: 'Failed to convert startTime from user timezone to UTC' },
            { status: 400 }
          )
        }
        updateData.start_time = startDateObj.toISOString()
        updateData.start_date = null
      }
      
      if (body.endTime !== undefined) {
        const endTimeUtc = convertToUtc(body.endTime, userTimezone)
        const endDateObj = new Date(endTimeUtc)
        if (isNaN(endDateObj.getTime())) {
          return NextResponse.json(
            { error: 'Failed to convert endTime from user timezone to UTC' },
            { status: 400 }
          )
        }
        updateData.end_time = endDateObj.toISOString()
        updateData.end_date = null
      }
    }

    const { data: event, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating calendar event:', error)
      return NextResponse.json(
        { error: 'Failed to update event', details: error.message },
        { status: 500 }
      )
    }

    // Sync to Google Calendar if connected
    try {
      const { data: googleConnection } = await supabase
        .from('calendar_connections')
        .select('id, access_token, refresh_token, token_expires_at, calendar_id, sync_enabled')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('sync_enabled', true)
        .single()

      if (googleConnection && googleConnection.calendar_id) {
        const validAccessToken = await getValidAccessToken(
          googleConnection.access_token,
          googleConnection.refresh_token,
          googleConnection.token_expires_at
        )

        if (validAccessToken) {
          const syncResult = await pushEventToGoogleCalendar(
            event,
            validAccessToken,
            googleConnection.calendar_id
          )

          if (syncResult.success) {
            // Update sync status
            const syncUpdate: Record<string, any> = {
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }
            
            if (syncResult.externalEventId) {
              syncUpdate.external_event_id = syncResult.externalEventId
              syncUpdate.external_calendar_id = googleConnection.calendar_id
            }

            await supabase
              .from('calendar_events')
              .update(syncUpdate)
              .eq('id', eventId)

            // Update access token if it was refreshed
            if (validAccessToken !== googleConnection.access_token) {
              const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
              await supabase
                .from('calendar_connections')
                .update({
                  access_token: validAccessToken,
                  token_expires_at: expiresAt,
                })
                .eq('id', googleConnection.id)
            }
          }
        }
      }
    } catch (syncError) {
      console.error('Error syncing event update to Google Calendar:', syncError)
      // Don't fail the request if sync fails
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error in PUT /api/calendar/events/[eventId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/calendar/events/[eventId]
 * Delete a calendar event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

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

    // Verify event exists and belongs to user
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, external_event_id, external_calendar_id')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Delete from Google Calendar if synced
    if (existingEvent.external_event_id && existingEvent.external_calendar_id) {
      try {
        const { data: googleConnection } = await supabase
          .from('calendar_connections')
          .select('id, access_token, refresh_token, token_expires_at, calendar_id')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .eq('calendar_id', existingEvent.external_calendar_id)
          .single()

        if (googleConnection) {
          const validAccessToken = await getValidAccessToken(
            googleConnection.access_token,
            googleConnection.refresh_token,
            googleConnection.token_expires_at
          )

          if (validAccessToken) {
            await deleteEventFromGoogleCalendar(
              existingEvent.external_event_id,
              validAccessToken,
              existingEvent.external_calendar_id
            )

            // Update access token if it was refreshed
            if (validAccessToken !== googleConnection.access_token) {
              const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
              await supabase
                .from('calendar_connections')
                .update({
                  access_token: validAccessToken,
                  token_expires_at: expiresAt,
                })
                .eq('id', googleConnection.id)
            }
          }
        }
      } catch (syncError) {
        console.error('Error deleting event from Google Calendar:', syncError)
        // Continue with local deletion even if Google sync fails
      }
    }

    // Delete event from local database
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting calendar event:', error)
      return NextResponse.json(
        { error: 'Failed to delete event', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/calendar/events/[eventId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

