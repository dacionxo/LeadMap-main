import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { sendViaMailbox, checkMailboxLimits } from '@/lib/email/sendViaMailbox'
import { createClient } from '@supabase/supabase-js'
import { shouldUseSymphonyForEmailQueue } from '@/lib/symphony/utils/feature-flags'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

/**
 * Send Email API
 * POST /api/emails/send
 * For sending a single email from composer (outside of campaigns)
 */

export async function POST(request: NextRequest) {
  try {
    // #region agent log
    await fetch('http://127.0.0.1:7243/ingest/d7e73e2c-c25f-423b-9d15-575aae9bf5cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/emails/send/route.ts:13',message:'POST handler entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // #region agent log
    await fetch('http://127.0.0.1:7243/ingest/d7e73e2c-c25f-423b-9d15-575aae9bf5cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/emails/send/route.ts:18',message:'auth check',data:{hasUser:!!user,hasAuthError:!!authError,authError:authError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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
      cc,
      bcc,
      replyTo,
      previewText
    } = body

    // #region agent log
    await fetch('http://127.0.0.1:7243/ingest/d7e73e2c-c25f-423b-9d15-575aae9bf5cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/emails/send/route.ts:32',message:'request body parsed',data:{mailboxId:!!mailboxId,to:!!to,subject:!!subject,html:!!html,scheduleAt:!!scheduleAt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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

    // #region agent log
    await fetch('http://127.0.0.1:7243/ingest/d7e73e2c-c25f-423b-9d15-575aae9bf5cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/emails/send/route.ts:60',message:'mailbox fetch result',data:{hasMailbox:!!mailbox,hasError:!!mailboxError,error:mailboxError?.message,active:mailbox?.active,provider:mailbox?.provider},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D'})}).catch(()=>{});
    // #endregion
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
      // Apply preview text preheader for scheduled emails (same as immediate send)
      const previewStr = typeof previewText === 'string' && previewText.trim() ? previewText.trim() : undefined
      const htmlForSchedule = previewStr
        ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewStr.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>${html}`
        : html

      const toEmailStr = Array.isArray(to) ? to.join(', ') : (typeof to === 'string' ? to : '')
      const fromName = mailbox.from_name || mailbox.display_name || null
      const fromEmail = mailbox.from_email || mailbox.email

      // Always write scheduled emails to email_queue so they appear in the Scheduled tab
      // and are processed by process-email-queue (which can dispatch to Symphony when enabled).
      const { data: queueEntry, error: queueError } = await supabaseAdmin
        .from('email_queue')
        .insert({
          user_id: user.id,
          mailbox_id: mailboxId,
          to_email: toEmailStr,
          subject,
          html: htmlForSchedule,
          from_name: fromName,
          from_email: fromEmail,
          type: 'transactional',
          priority: 7,
          status: 'queued',
          scheduled_at: scheduleAt,
          retry_count: 0,
          max_retries: 3
        })
        .select()
        .single()

      if (queueError) {
        console.error('Email queue scheduling error:', queueError)
        return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        email: { id: queueEntry.id, status: 'queued', scheduled_at: queueEntry.scheduled_at },
        message: shouldUseSymphonyForEmailQueue()
          ? 'Email scheduled successfully (Symphony queue)'
          : 'Email scheduled successfully'
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
    }, supabaseAdmin)

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

    // Send email (pass supabaseAdmin for transactional providers)
    const fromName = mailbox.from_name || mailbox.display_name
    const fromEmail = mailbox.from_email || mailbox.email

    let sendResult
    try {
      // #region agent log
      await fetch('http://127.0.0.1:7243/ingest/d7e73e2c-c25f-423b-9d15-575aae9bf5cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/emails/send/route.ts:164',message:'calling sendViaMailbox',data:{provider:mailbox.provider,to,hasSubject:!!subject},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const ccStr = Array.isArray(cc) ? cc.join(', ') : (typeof cc === 'string' ? cc : undefined)
      const bccStr = Array.isArray(bcc) ? bcc.join(', ') : (typeof bcc === 'string' ? bcc : undefined)
      const replyToStr = typeof replyTo === 'string' && replyTo.trim() ? replyTo.trim() : undefined

      // Prepublish preview text as hidden preheader so clients show it in inbox list view
      const previewStr = typeof previewText === 'string' && previewText.trim() ? previewText.trim() : undefined
      const finalHtml = previewStr
        ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewStr.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>${html}`
        : html

      sendResult = await sendViaMailbox(mailbox, {
        to,
        subject,
        html: finalHtml,
        fromName,
        fromEmail,
        ...(ccStr && { cc: ccStr }),
        ...(bccStr && { bcc: bccStr }),
        ...(replyToStr && { replyTo: replyToStr })
      }, supabaseAdmin)
      // #region agent log
      await fetch('http://127.0.0.1:7243/ingest/d7e73e2c-c25f-423b-9d15-575aae9bf5cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/emails/send/route.ts:174',message:'sendViaMailbox result',data:{success:sendResult.success,error:sendResult.error,hasMessageId:!!sendResult.providerMessageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    } catch (error: any) {
      console.error('Error sending email via mailbox:', error)
      // #region agent log
      await fetch('http://127.0.0.1:7243/ingest/d7e73e2c-c25f-423b-9d15-575aae9bf5cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/emails/send/route.ts:177',message:'sendViaMailbox exception',data:{error:error?.message,errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ 
        error: error.message || 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 })
    }

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

      // Create email_thread + email_message so compose emails appear in Unibox Sent folder
      const sentAt = new Date().toISOString()
      const providerThreadId = `compose-${emailRecord.id}`
      const toEmails = Array.isArray(to) ? to : (typeof to === 'string' ? to.split(',').map((e: string) => e.trim()).filter(Boolean) : [])
      const snippet = (html || '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200) || '(No preview)'

      const { data: newThread, error: threadError } = await supabaseAdmin
        .from('email_threads')
        .insert({
          user_id: user.id,
          mailbox_id: mailboxId,
          provider_thread_id: providerThreadId,
          subject: subject || '(No Subject)',
          last_message_at: sentAt,
          last_outbound_at: sentAt,
          status: 'open',
          unread: false,
        })
        .select('id')
        .single()

      if (!threadError && newThread) {
        const { data: newMessage, error: messageError } = await supabaseAdmin
          .from('email_messages')
          .insert({
            thread_id: newThread.id,
            user_id: user.id,
            mailbox_id: mailboxId,
            direction: 'outbound',
            provider_message_id: sendResult.providerMessageId || `compose-${emailRecord.id}`,
            subject: subject || '(No Subject)',
            snippet,
            body_html: html || null,
            body_plain: (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null,
            sent_at: sentAt,
            read: true,
          })
          .select('id')
          .single()

        if (!messageError && newMessage) {
          const participants: Array<{ message_id: string; type: string; email: string; name: string | null }> = [
            { message_id: newMessage.id, type: 'from', email: mailbox.email, name: mailbox.display_name || null },
            ...toEmails.map((email: string) => ({ message_id: newMessage.id, type: 'to', email, name: null })),
          ]
          for (const p of participants) {
            await supabaseAdmin.from('email_participants').insert({
              message_id: p.message_id,
              type: p.type,
              email: p.email,
              name: p.name,
            })
          }
        }
      }
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
    // Always return JSON, never HTML - this prevents the "<!DOCTYPE" error
    return NextResponse.json({
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
