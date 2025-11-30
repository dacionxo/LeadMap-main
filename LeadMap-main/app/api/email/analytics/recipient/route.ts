import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

/**
 * Per-Recipient Engagement Analytics
 * GET /api/email/analytics/recipient?email=... or ?contactId=...
 * Returns engagement profile for a specific recipient
 */

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipientEmail = searchParams.get('email')
    const contactId = searchParams.get('contactId')

    if (!recipientEmail && !contactId) {
      return NextResponse.json({ error: 'email or contactId parameter is required' }, { status: 400 })
    }

    // Use the database function to get engagement
    let engagement: any = null

    if (recipientEmail) {
      const { data, error } = await supabase.rpc('get_recipient_engagement', {
        p_user_id: user.id,
        p_recipient_email: recipientEmail.toLowerCase()
      })

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to fetch engagement data' }, { status: 500 })
      }

      engagement = data?.[0] || null
    }

    // Also get recent events for this recipient
    let eventsQuery = supabase
      .from('email_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_timestamp', { ascending: false })
      .limit(50)

    if (recipientEmail) {
      eventsQuery = eventsQuery.eq('recipient_email', recipientEmail.toLowerCase())
    } else if (contactId) {
      eventsQuery = eventsQuery.eq('contact_id', contactId)
    }

    const { data: recentEvents, error: eventsError } = await eventsQuery

    if (eventsError) {
      console.error('Events query error:', eventsError)
    }

    return NextResponse.json({
      engagement: engagement || {
        total_emails_sent: 0,
        total_emails_delivered: 0,
        total_emails_opened: 0,
        total_emails_clicked: 0,
        total_emails_replied: 0,
        total_opens: 0,
        total_clicks: 0,
        open_rate: 0,
        click_rate: 0,
        reply_rate: 0
      },
      recentEvents: recentEvents || []
    })
  } catch (error: any) {
    console.error('Recipient analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

