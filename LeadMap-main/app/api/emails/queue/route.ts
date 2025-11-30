import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Email Queue API
 * POST /api/emails/queue - Queue email for background processing
 */

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      mailboxId,
      to,
      subject,
      html,
      scheduleAt,
      type = 'transactional',
      priority = 5,
      campaignId,
      campaignRecipientId
    } = body

    if (!mailboxId || !to || !subject || !html) {
      return NextResponse.json({
        error: 'Mailbox ID, recipient email, subject, and HTML content are required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify mailbox belongs to user
    const { data: mailbox, error: mailboxError } = await supabaseAdmin
      .from('mailboxes')
      .select('id, user_id, from_name, from_email, email, display_name')
      .eq('id', mailboxId)
      .eq('user_id', user.id)
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })
    }

    // Create queue entry
    const { data: queueEntry, error: queueError } = await supabaseAdmin
      .from('email_queue')
      .insert({
        user_id: user.id,
        mailbox_id: mailboxId,
        to_email: to,
        subject,
        html,
        from_name: mailbox.from_name || mailbox.display_name,
        from_email: mailbox.from_email || mailbox.email,
        type,
        priority,
        status: 'queued',
        scheduled_at: scheduleAt || null,
        campaign_id: campaignId || null,
        campaign_recipient_id: campaignRecipientId || null
      })
      .select()
      .single()

    if (queueError) {
      console.error('Email queue error:', queueError)
      return NextResponse.json({ error: 'Failed to queue email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      queue_id: queueEntry.id,
      status: 'queued',
      scheduled_at: queueEntry.scheduled_at,
      message: 'Email queued for processing'
    })
  } catch (error: any) {
    console.error('Email queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

