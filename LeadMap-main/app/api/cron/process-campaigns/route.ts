import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-singleton'
import { sendViaMailbox, checkMailboxLimits } from '@/lib/email/sendViaMailbox'
import { checkCampaignThrottle } from '@/lib/email/campaigns/throttle'
import { checkWarmupLimit, calculateNextWarmupDay } from '@/lib/email/campaigns/warmup'
import { checkSendWindow } from '@/lib/email/campaigns/send-window'
import { checkAndStopOnReply } from '@/lib/email/campaigns/reply-detection'
import { substituteTemplateVariables } from '@/lib/email/template-variables'
import { getUserEmailSettings, appendComplianceFooter, getUnsubscribeUrl } from '@/lib/email/email-settings'
import { Mailbox } from '@/lib/email/types'

/**
 * Campaign Processing Cron Job
 * Processes campaign recipients and sends next steps in sequences
 * Runs every minute
 * 
 * Vercel Cron calls with GET, but we also support POST for manual triggers
 */
async function runCronJob(request: NextRequest) {
  try {
    // Verify cron secret or service key
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-vercel-cron-secret')
    const serviceKey = request.headers.get('x-service-key')
    
    const expectedCronSecret = process.env.CRON_SECRET
    const isValidRequest = 
      (cronSecret && cronSecret === expectedCronSecret) ||
      (serviceKey && serviceKey === process.env.CALENDAR_SERVICE_KEY) ||
      (authHeader && (authHeader === `Bearer ${expectedCronSecret}` || authHeader === `Bearer ${process.env.CALENDAR_SERVICE_KEY}`))

    if (!isValidRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use singleton service role client (no auto-refresh, no session persistence)
    const supabase = getServiceRoleClient()

    const now = new Date()
    const results: any[] = []

    // Get active campaigns (running or scheduled)
    const { data: activeCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .in('status', ['running', 'scheduled'])
      .or(`start_at.is.null,start_at.lte.${now.toISOString()}`)

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No active campaigns to process'
      })
    }

    // Process each campaign
    for (const campaign of activeCampaigns as Array<{ id: string; [key: string]: unknown }>) {
      try {
        // Check if campaign has passed its end date
        if (campaign.end_at) {
          const endDate = new Date(campaign.end_at as string)
          if (now > endDate) {
            // Campaign has ended, mark as completed
            const updateData: any = {
              status: 'completed',
              completed_at: now.toISOString()
            }
            await (supabase.from('campaigns') as any)
              .update(updateData)
              .eq('id', campaign.id)
            
            results.push({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              status: 'completed',
              reason: 'Campaign end date has passed'
            })
            continue
          }
        }

        // Check campaign throttle
        const throttleCheck = await checkCampaignThrottle(campaign.id, supabase)
        if (!throttleCheck.allowed) {
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: 'throttled',
            reason: throttleCheck.reason
          })
          continue
        }

        // Check warmup limits
        if (campaign.warmup_enabled) {
          // Count emails sent today for this campaign
          const todayStart = new Date(now)
          todayStart.setHours(0, 0, 0, 0)
          
          const { data: todayEmails } = await supabase
            .from('emails')
            .select('sent_at')
            .eq('campaign_id', campaign.id)
            .eq('status', 'sent')
            .gte('sent_at', todayStart.toISOString())

          const emailsSentToday = todayEmails?.length || 0

          // Update warmup day if needed
          const campaignStart = campaign.start_at ? new Date(campaign.start_at as string) : new Date(campaign.created_at as string)
          const currentWarmupDay = typeof campaign.current_warmup_day === 'number' ? campaign.current_warmup_day : 0
          const nextWarmupDay = calculateNextWarmupDay(campaignStart, currentWarmupDay)

          if (nextWarmupDay !== currentWarmupDay) {
            const updateData: any = {
              current_warmup_day: nextWarmupDay
            }
            await (supabase.from('campaigns') as any)
              .update(updateData)
              .eq('id', campaign.id)
          }

          const warmupCheck = checkWarmupLimit(
            campaign.warmup_enabled as boolean,
            nextWarmupDay,
            campaign.warmup_schedule as { [key: string]: number } | undefined,
            emailsSentToday
          )

          if (!warmupCheck.allowed) {
            results.push({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              status: 'warmup_limited',
              reason: warmupCheck.reason
            })
            continue
          }
        }

        // Check send window
        if (campaign.send_window_start && campaign.send_window_end) {
          const windowCheck = checkSendWindow({
            start: campaign.send_window_start as string,
            end: campaign.send_window_end as string,
            daysOfWeek: campaign.send_days_of_week as number[] | undefined,
            timezone: (campaign.timezone as string) || 'UTC'
          })

          if (!windowCheck.allowed) {
            results.push({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              status: 'outside_window',
              reason: windowCheck.reason,
              next_available: windowCheck.nextAvailableTime
            })
            continue
          }
        }

        // Get recipients ready for next step
        const { data: readyRecipients, error: recipientsError } = await supabase
          .from('campaign_recipients')
          .select('*')
          .eq('campaign_id', campaign.id)
          .in('status', ['pending', 'queued', 'in_progress'])
          .or(`next_send_at.is.null,next_send_at.lte.${now.toISOString()}`)
          .limit(50) // Process 50 at a time

        if (recipientsError) {
          console.error(`Error fetching recipients for campaign ${campaign.id}:`, recipientsError)
          continue
        }

        if (!readyRecipients || readyRecipients.length === 0) {
          continue
        }

        // Get campaign steps
        const { data: steps, error: stepsError } = await supabase
          .from('campaign_steps')
          .select('*')
          .eq('campaign_id', campaign.id)
          .order('step_number', { ascending: true })

        if (stepsError || !steps || steps.length === 0) {
          console.error(`No steps found for campaign ${campaign.id}`)
          continue
        }

        // Get mailbox
        const { data: mailbox, error: mailboxError } = await supabase
          .from('mailboxes')
          .select('*')
          .eq('id', campaign.mailbox_id as string)
          .single()

        if (mailboxError || !mailbox || !(mailbox as { active?: boolean }).active) {
          console.error(`Mailbox not found or inactive for campaign ${campaign.id}`)
          continue
        }

        // Process each recipient
        let processedCount = 0
        for (const recipient of readyRecipients as Array<{ id: string; [key: string]: unknown }>) {
          try {
            // Check stop on reply
            const replyCheck = await checkAndStopOnReply(recipient.id, campaign.id, supabase)
            if (replyCheck.shouldStop) {
              const updateData: any = {
                status: 'stopped'
              }
              await (supabase.from('campaign_recipients') as any)
                .update(updateData)
                .eq('id', recipient.id)
              continue
            }

            // Determine which step to send
            const currentStepNumber = typeof recipient.current_step_number === 'number' ? recipient.current_step_number : 0
            const nextStep = (steps as Array<{ step_number: number; [key: string]: unknown }>).find((s) => s.step_number === currentStepNumber + 1)

            if (!nextStep) {
              // No more steps, mark as completed
              const updateData: any = {
                status: 'completed',
                current_step_number: currentStepNumber
              }
              await (supabase.from('campaign_recipients') as any)
                .update(updateData)
                .eq('id', recipient.id)
              continue
            }

            // Check step-specific send window
            if (nextStep.send_window_start && nextStep.send_window_end) {
              const stepWindowCheck = checkSendWindow({
                start: nextStep.send_window_start as string,
                end: nextStep.send_window_end as string,
                daysOfWeek: campaign.send_days_of_week as number[] | undefined,
                timezone: (campaign.timezone as string) || 'UTC'
              })

              if (!stepWindowCheck.allowed) {
                // Schedule for next available time
                const updateData: any = {
                  next_send_at: stepWindowCheck.nextAvailableTime?.toISOString()
                }
                await (supabase.from('campaign_recipients') as any)
                  .update(updateData)
                  .eq('id', recipient.id)
                continue
              }
            }

            // Check mailbox rate limits
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

            const { data: recentEmails } = await supabase
              .from('emails')
              .select('sent_at')
              .eq('mailbox_id', (mailbox as { id: string; [key: string]: unknown }).id)
              .eq('status', 'sent')
              .not('sent_at', 'is', null)

            const hourlyCount = recentEmails?.filter((e: any) => 
              e.sent_at && new Date(e.sent_at) >= oneHourAgo
            ).length || 0

            const dailyCount = recentEmails?.filter((e: any) => 
              e.sent_at && new Date(e.sent_at) >= oneDayAgo
            ).length || 0

            const mailboxForLimits = mailbox as Mailbox
            const limitCheck = await checkMailboxLimits(mailboxForLimits, {
              hourly: hourlyCount,
              daily: dailyCount
            }, supabase)

            if (!limitCheck.allowed) {
              // Rate limited, skip for now
              continue
            }

            // Prepare email content with template variables
            const recipientData = {
              email: recipient.email as string,
              firstName: (recipient.first_name as string) || '',
              lastName: (recipient.last_name as string) || '',
              company: (recipient.company as string) || '',
              ...(recipient.metadata as Record<string, unknown> || {})
            }

            const processedSubject = substituteTemplateVariables(nextStep.subject as string, recipientData)
            let processedHtml = substituteTemplateVariables(nextStep.html as string, recipientData)

            // Get user's email settings and append compliance footer (with fallback on error)
            let emailSettings
            try {
              emailSettings = await getUserEmailSettings(campaign.user_id as string, supabase)
            } catch (error) {
              console.warn('Error fetching email settings, using defaults:', error)
              emailSettings = {
                from_name: 'LeadMap',
                reply_to: undefined,
                default_footer_html: '',
                unsubscribe_footer_html: '',
                physical_address: undefined
              }
            }
            const unsubscribeUrl = getUnsubscribeUrl(campaign.user_id as string, recipient.id)
            processedHtml = appendComplianceFooter(processedHtml, emailSettings, unsubscribeUrl)

            // Create email record
            const emailInsertData: any = {
              user_id: campaign.user_id as string,
              mailbox_id: campaign.mailbox_id as string,
              campaign_id: campaign.id,
              campaign_step_id: nextStep.id as string,
              campaign_recipient_id: recipient.id,
              to_email: recipient.email as string,
              subject: processedSubject,
              html: processedHtml,
              status: 'queued',
              direction: 'sent',
              type: 'campaign'
            }
            const { data: emailRecord, error: emailError } = await supabase
              .from('emails')
              .insert(emailInsertData)
              .select()
              .single()

            if (emailError) {
              console.error(`Error creating email for recipient ${recipient.id}:`, emailError)
              continue
            }

            // Send email (pass supabase for transactional providers)
            const mailboxTyped = mailbox as Mailbox
            const sendResult = await sendViaMailbox(mailboxTyped, {
              to: recipient.email as string,
              subject: processedSubject,
              html: processedHtml,
              fromName: mailboxTyped.from_name || mailboxTyped.display_name || emailSettings.from_name,
              fromEmail: mailboxTyped.from_email || mailboxTyped.email
            }, supabase)

            if (sendResult.success) {
              // Update email record
              const emailUpdateData: any = {
                status: 'sent',
                sent_at: new Date().toISOString(),
                provider_message_id: sendResult.providerMessageId
              }
              await (supabase.from('emails') as any)
                .update(emailUpdateData)
                .eq('id', (emailRecord as { id: string }).id)

              // Update recipient
              const delayHours = typeof nextStep.delay_hours === 'number' ? nextStep.delay_hours : 0
              const delayDays = typeof nextStep.delay_days === 'number' ? nextStep.delay_days : 0
              const nextSendAt = new Date(now.getTime() + (delayHours * 60 * 60 * 1000) + (delayDays * 24 * 60 * 60 * 1000))

              const recipientUpdateData: any = {
                current_step_number: nextStep.step_number,
                last_step_sent: nextStep.step_number,
                last_sent_at: new Date().toISOString(),
                next_send_at: nextSendAt.toISOString(),
                status: 'in_progress',
                updated_at: new Date().toISOString()
              }
              await (supabase.from('campaign_recipients') as any)
                .update(recipientUpdateData)
                .eq('id', recipient.id)

              processedCount++
            } else {
              // Send failed
              const emailFailData: any = {
                status: 'failed',
                error: sendResult.error
              }
              await (supabase.from('emails') as any)
                .update(emailFailData)
                .eq('id', (emailRecord as { id: string }).id)

              const recipientErrorData: any = {
                error_count: (typeof recipient.error_count === 'number' ? recipient.error_count : 0) + 1,
                last_error: sendResult.error
              }
              await (supabase.from('campaign_recipients') as any)
                .update(recipientErrorData)
                .eq('id', recipient.id)
            }
          } catch (error: any) {
            console.error(`Error processing recipient ${recipient.id}:`, error)
          }
        }

        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: 'processed',
          recipients_processed: processedCount
        })

        // Update campaign report (if RPC function exists)
        try {
          const rpcResult = await supabase.rpc('update_campaign_report', {
            p_campaign_id: campaign.id,
            p_report_date: now.toISOString().split('T')[0]
          })
          if (rpcResult.error) {
            // RPC function may not exist, log but don't fail
            console.warn('Failed to update campaign report:', rpcResult.error)
          }
        } catch (rpcError) {
          // RPC function may not exist, log but don't fail
          console.warn('Failed to update campaign report:', rpcError)
        }
      } catch (error: any) {
        console.error(`Error processing campaign ${campaign.id}:`, error)
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: 'error',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })
  } catch (error: any) {
    console.error('Campaign processing error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

// Vercel Cron calls with GET, but we also support POST for manual triggers
export async function GET(request: NextRequest) {
  return runCronJob(request)
}

export async function POST(request: NextRequest) {
  return runCronJob(request)
}

