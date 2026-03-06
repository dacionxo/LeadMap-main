import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * DELETE /api/calendar/connections/[connectionId]
 * Delete a calendar connection and all calendar events that were associated
 * with that connection (synced from or pushed to that Google calendar).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = await params

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

    // Fetch connection (need calendar_id to delete associated events)
    const { data: connection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('id, calendar_id')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Delete all calendar events associated with this connection (synced from or pushed to this calendar)
    if (connection.calendar_id) {
      const { error: eventsError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', user.id)
        .eq('external_calendar_id', connection.calendar_id)

      if (eventsError) {
        console.error('Error deleting events for connection:', eventsError)
        // Continue to delete the connection; events cleanup can be retried or done by cron
      }
    }

    // Delete connection
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting connection:', error)
      return NextResponse.json(
        { error: 'Failed to delete connection', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/calendar/connections/[connectionId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

