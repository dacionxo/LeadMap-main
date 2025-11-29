import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Countdown Timers API
 * GET: List user's countdown timers
 * POST: Create new countdown timer
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('countdown_timers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch timers' }, { status: 500 })
    }

    return NextResponse.json({ timers: data || [] })
  } catch (error) {
    console.error('Countdown timers GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, end_date, duration_seconds } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    if (type === 'end_date' && !end_date) {
      return NextResponse.json({ error: 'End date is required for end_date type' }, { status: 400 })
    }

    if (type === 'duration' && !duration_seconds) {
      return NextResponse.json({ error: 'Duration is required for duration type' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('countdown_timers')
      .insert({
        user_id: user.id,
        name,
        type,
        end_date: type === 'end_date' ? end_date : null,
        duration_seconds: type === 'duration' ? duration_seconds : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create timer' }, { status: 500 })
    }

    return NextResponse.json({ timer: data })
  } catch (error) {
    console.error('Countdown timers POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

