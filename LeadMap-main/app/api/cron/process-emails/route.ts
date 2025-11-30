import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendViaMailbox, checkMailboxLimits } from '@/lib/email/sendViaMailbox'
import { Mailbox } from '@/lib/email/types'

/**
 * Email Processing Scheduler
 * This endpoint should be called by a cron job every minute
 * Processes queued emails respecting rate limits and campaign status
 * 
 * To set up Supabase cron:
 * SELECT cron.schedule(
 *   'process-emails',
 *   '* * * * *', -- Every minute
 *   $$
 *   SELECT net.http_post(
 *     url:='https://www.growyourdigitalleverage.com/api/cron/process-emails',
 *     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SECRET"}'::jsonb
 *   ) AS request_id;
 *   $$
 * );
 */

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or service key (same pattern as other cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-vercel-cron-secret')
    const serviceKey = request.headers.get('x-service-key')
    
    const isValidRequest = 
      cronSecret === process.env.CRON_SECRET ||
      serviceKey === process.env.CALENDAR_SERVICE_KEY ||
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      authHeader === `Bearer ${process.env.CALENDAR_SERVICE_KEY}`

    if (!isValidRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Find emails ready to send (only sent emails, not received)
    // Status = queued, scheduled_at <= now, mailbox active, campaign not paused/cancelled
    const { data: queuedEmails, error: emailsError } = await supabase
      .from('emails')
      .select(`
        *,
        mailbox:mailboxes(*),
        campaign:campaigns(status)
      `)
      .eq('status', 'queued')
      .eq('direction', 'sent') // Only process sent emails, not received
      .lte('scheduled_at', now.toISOString())
      .not('mailbox_id', 'is', null)

    if (emailsError) {
      console.error('Error fetching queued emails:', emailsError)
      return NextResponse.json({ error: 'Failed to fetch queued emails' }, { status: 500 })
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No emails to process',
        processed: 0
      })
    }

    // Filter out emails where:
    // 1. Mailbox is not active
    // 2. Campaign is paused or cancelled
    const validEmails = queuedEmails.filter((email: any) => {
      const mailbox = email.mailbox
      const campaign = email.campaign

      if (!mailbox || !mailbox.active) {
        return false
      }

      if (campaign && ['paused', 'cancelled'].includes(campaign.status)) {
        return false
      }

      return true
    })

    if (validEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No valid emails to process',
        processed: 0
      })
    }

    // Group emails by mailbox to respect rate limits
    const emailsByMailbox = new Map<string, typeof validEmails>()
    
    for (const email of validEmails) {
      const mailboxId = email.mailbox_id
      if (!emailsByMailbox.has(mailboxId)) {
        emailsByMailbox.set(mailboxId, [])
      }
      emailsByMailbox.get(mailboxId)!.push(email)
    }

    let totalProcessed = 0
    const results: any[] = []

    // Process each mailbox
    for (const [mailboxId, emails] of emailsByMailbox.entries()) {
      const mailbox = emails[0].mailbox as Mailbox

      // Count emails sent in last hour and day for this mailbox (only sent emails)
      const { data: recentEmails } = await supabase
        .from('emails')
        .select('sent_at')
        .eq('mailbox_id', mailboxId)
        .eq('direction', 'sent') // Only count sent emails for rate limiting
        .eq('status', 'sent')
        .not('sent_at', 'is', null)

      const hourlyCount = recentEmails?.filter((e: any) => 
        e.sent_at && new Date(e.sent_at) >= oneHourAgo
      ).length || 0

      const dailyCount = recentEmails?.filter((e: any) => 
        e.sent_at && new Date(e.sent_at) >= oneDayAgo
      ).length || 0

      const limitCheck = await checkMailboxLimits(mailbox, {
        hourly: hourlyCount,
        daily: dailyCount
      })

      if (!limitCheck.allowed) {
        results.push({
          mailboxId,
          error: limitCheck.reason,
          processed: 0
        })
        continue
      }

      // Calculate how many we can send
      const remaining = Math.min(
        limitCheck.remainingHourly || 0,
        limitCheck.remainingDaily || 0,
        emails.length
      )

      // Process emails up to the limit
      const emailsToProcess = emails.slice(0, remaining)
      let processed = 0

      for (const email of emailsToProcess) {
        try {
          // Mark as sending
          await supabase
            .from('emails')
            .update({ status: 'sending' })
            .eq('id', email.id)

          // Send email
          const fromName = mailbox.from_name || mailbox.display_name
          const fromEmail = mailbox.from_email || mailbox.email

          const sendResult = await sendViaMailbox(mailbox, {
            to: email.to_email,
            subject: email.subject,
            html: email.html,
            fromName,
            fromEmail
          })

          if (sendResult.success) {
            // Update email record
            await supabase
              .from('emails')
              .update({
                status: 'sent',
                sent_at: now.toISOString(),
                provider_message_id: sendResult.providerMessageId
              })
              .eq('id', email.id)

            // Update campaign recipient if applicable
            if (email.campaign_recipient_id) {
              await supabase
                .from('campaign_recipients')
                .update({
                  last_sent_at: now.toISOString(),
                  status: email.campaign_step_id ? 'in_progress' : 'completed'
                })
                .eq('id', email.campaign_recipient_id)

              // Update last_step_sent if this is a campaign step
              if (email.campaign_step_id) {
                // Get step number
                const { data: step } = await supabase
                  .from('campaign_steps')
                  .select('step_number')
                  .eq('id', email.campaign_step_id)
                  .single()

                if (step) {
                  await supabase
                    .from('campaign_recipients')
                    .update({ last_step_sent: step.step_number })
                    .eq('id', email.campaign_recipient_id)
                }
              }

              // Schedule next step if this is a sequence campaign
              if (email.campaign_id && email.campaign_step_id) {
                await scheduleNextStep(
                  supabase,
                  email.campaign_id,
                  email.campaign_recipient_id,
                  email.campaign_step_id
                )
              }
            }

            processed++
          } else {
            // Mark as failed
            await supabase
              .from('emails')
              .update({
                status: 'failed',
                error: sendResult.error
              })
              .eq('id', email.id)

            // Update mailbox last_error
            await supabase
              .from('mailboxes')
              .update({ last_error: sendResult.error })
              .eq('id', mailboxId)

            // Update recipient status
            if (email.campaign_recipient_id) {
              await supabase
                .from('campaign_recipients')
                .update({ status: 'failed' })
                .eq('id', email.campaign_recipient_id)
            }
          }
        } catch (error: any) {
          console.error(`Error processing email ${email.id}:`, error)
          
          await supabase
            .from('emails')
            .update({
              status: 'failed',
              error: error.message || 'Unknown error'
            })
            .eq('id', email.id)
        }

        // Small delay between sends to avoid overwhelming the provider
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      totalProcessed += processed
      results.push({
        mailboxId,
        processed,
        remaining: emails.length - processed
      })
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} emails`,
      processed: totalProcessed,
      results
    })
  } catch (error: any) {
    console.error('Email processing error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Schedule the next step in a sequence campaign
 */
async function scheduleNextStep(
  supabase: any,
  campaignId: string,
  recipientId: string,
  currentStepId: string
) {
  try {
    // Get current step
    const { data: currentStep } = await supabase
      .from('campaign_steps')
      .select('step_number, delay_hours, stop_on_reply')
      .eq('id', currentStepId)
      .single()

    if (!currentStep) return

    // Check if recipient has replied (stop_on_reply)
    if (currentStep.stop_on_reply) {
      const { data: recipient } = await supabase
        .from('campaign_recipients')
        .select('replied')
        .eq('id', recipientId)
        .single()

      if (recipient?.replied) {
        // Don't schedule next step
        return
      }
    }

    // Get next step
    const { data: nextStep } = await supabase
      .from('campaign_steps')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('step_number', currentStep.step_number + 1)
      .single()

    if (!nextStep) {
      // No more steps, mark recipient as completed
      await supabase
        .from('campaign_recipients')
        .update({ status: 'completed' })
        .eq('id', recipientId)
      return
    }

    // Get recipient info
    const { data: recipient } = await supabase
      .from('campaign_recipients')
      .select('email, campaign:campaigns(mailbox_id, timezone)')
      .eq('id', recipientId)
      .single()

    if (!recipient) return

    // Calculate scheduled time
    const delayMs = currentStep.delay_hours * 60 * 60 * 1000
    const scheduledAt = new Date(Date.now() + delayMs)

    // Get campaign mailbox
    const campaign = recipient.campaign as any
    const { data: mailbox } = await supabase
      .from('mailboxes')
      .select('id')
      .eq('id', campaign.mailbox_id)
      .single()

    if (!mailbox) return

    // Get user_id from campaign
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (!campaignData) return

    // Create email record for next step
    await supabase
      .from('emails')
      .insert({
        user_id: campaignData.user_id,
        mailbox_id: campaign.mailbox_id,
        campaign_id: campaignId,
        campaign_step_id: nextStep.id,
        campaign_recipient_id: recipientId,
        to_email: recipient.email,
        subject: nextStep.subject,
        html: nextStep.html,
        status: 'queued',
        scheduled_at: scheduledAt.toISOString(),
        direction: 'sent' // Explicitly mark as sent email
      })
  } catch (error) {
    console.error('Error scheduling next step:', error)
  }
}

