import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { sendViaMailbox, checkMailboxLimits } from '@/lib/email/sendViaMailbox'
import { createClient } from '@supabase/supabase-js'

/**
 * Send Email API
 * POST /api/emails/send
 * For sending a single email from composer (outside of campaigns)
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
      scheduleAt
    } = body

    if (!mailboxId || !to || !subject || !html) {
      return NextResponse.json({
        error: 'Mailbox ID, recipient email, subject, and HTML content are required'
      }, { status: 400 })
    }

    // Get mailbox (we need service role to read tokens)
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

    const { data: mailbox, error: mailboxError } = await supabaseAdmin
      .from('mailboxes')
      .select('*')
      .eq('id', mailboxId)
      .eq('user_id', user.id)
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })
    }

    if (!mailbox.active) {
      return NextResponse.json({ error: 'Mailbox is not active' }, { status: 400 })
    }

    // Check if scheduling
    const scheduleDate = scheduleAt ? new Date(scheduleAt) : null
    const now = new Date()

    if (scheduleDate && scheduleDate > now) {
      // Schedule for later - create email record with queued status
      const { data: emailRecord, error: emailError } = await supabase
        .from('emails')
        .insert({
          user_id: user.id,
          mailbox_id: mailboxId,
          to_email: to,
          subject,
          html,
          status: 'queued',
          scheduled_at: scheduleAt,
          direction: 'sent' // Explicitly mark as sent email
        })
        .select()
        .single()

      if (emailError) {
        console.error('Email scheduling error:', emailError)
        return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        email: emailRecord,
        message: 'Email scheduled successfully'
      })
    }

    // Send immediately - check rate limits first
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Count emails sent in last hour and day
    const { data: recentEmails } = await supabase
      .from('emails')
      .select('sent_at')
      .eq('mailbox_id', mailboxId)
      .eq('status', 'sent')
      .not('sent_at', 'is', null)

    interface EmailWithSentAt {
      sent_at: string | null
    }

    const hourlyCount = recentEmails?.filter((e: EmailWithSentAt) => 
      e.sent_at && new Date(e.sent_at) >= oneHourAgo
    ).length || 0

    const dailyCount = recentEmails?.filter((e: EmailWithSentAt) => 
      e.sent_at && new Date(e.sent_at) >= oneDayAgo
    ).length || 0

    const limitCheck = await checkMailboxLimits(mailbox, {
      hourly: hourlyCount,
      daily: dailyCount
    })

    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: limitCheck.reason || 'Rate limit exceeded',
        remainingHourly: limitCheck.remainingHourly,
        remainingDaily: limitCheck.remainingDaily
      }, { status: 429 })
    }

    // Create email record with sending status
    const { data: emailRecord, error: emailCreateError } = await supabase
      .from('emails')
      .insert({
        user_id: user.id,
        mailbox_id: mailboxId,
        to_email: to,
        subject,
        html,
        status: 'sending',
        scheduled_at: null,
        direction: 'sent' // Explicitly mark as sent email
      })
      .select()
      .single()

    if (emailCreateError || !emailRecord) {
      console.error('Email record creation error:', emailCreateError)
      return NextResponse.json({ error: 'Failed to create email record' }, { status: 500 })
    }

    // Send email
    const fromName = mailbox.from_name || mailbox.display_name
    const fromEmail = mailbox.from_email || mailbox.email

    const sendResult = await sendViaMailbox(mailbox, {
      to,
      subject,
      html,
      fromName,
      fromEmail
    })

    // Update email record with result
    if (sendResult.success) {
      await supabase
        .from('emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: sendResult.providerMessageId
        })
        .eq('id', emailRecord.id)
    } else {
      await supabase
        .from('emails')
        .update({
          status: 'failed',
          error: sendResult.error
        })
        .eq('id', emailRecord.id)

      // Update mailbox last_error
      await supabaseAdmin
        .from('mailboxes')
        .update({
          last_error: sendResult.error
        })
        .eq('id', mailboxId)

      return NextResponse.json({
        success: false,
        error: sendResult.error || 'Failed to send email',
        email: {
          ...emailRecord,
          status: 'failed',
          error: sendResult.error
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: {
        ...emailRecord,
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_message_id: sendResult.providerMessageId
      },
      message: 'Email sent successfully'
    })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}
