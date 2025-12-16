/**
 * Schedule Next Step Helper
 * Schedules the next step in a sequence campaign after an email is sent
 */

import { executeSelectOperation, executeUpdateOperation, executeInsertOperation } from '@/lib/cron/database'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Schedules the next step in a sequence campaign
 * 
 * @param supabase - Supabase client
 * @param campaignId - Campaign ID
 * @param recipientId - Recipient ID
 * @param currentStepId - Current step ID that was just sent
 */
export async function scheduleNextStep(
  supabase: SupabaseClient,
  campaignId: string,
  recipientId: string,
  currentStepId: string
): Promise<void> {
  try {
    // Get campaign to check campaign-level stop_on_reply
    const campaignResult = await executeSelectOperation<{ stop_on_reply: boolean }>(
      supabase,
      'campaigns',
      'stop_on_reply',
      (query) => {
        return (query as any).eq('id', campaignId).single()
      },
      {
        operation: 'fetch_campaign_for_reply_check',
        campaignId,
      }
    )

    // Get current step
    const stepResult = await executeSelectOperation<{
      step_number: number
      delay_hours: number
      delay_days: number
      stop_on_reply: boolean
    }>(
      supabase,
      'campaign_steps',
      'step_number, delay_hours, delay_days, stop_on_reply',
      (query) => {
        return (query as any).eq('id', currentStepId).single()
      },
      {
        operation: 'fetch_current_step',
        stepId: currentStepId,
      }
    )

    if (!stepResult.success || !stepResult.data || stepResult.data.length === 0) {
      return
    }

    const currentStep = stepResult.data[0]

    // Check if recipient has replied
    const recipientResult = await executeSelectOperation<{ replied: boolean; status: string }>(
      supabase,
      'campaign_recipients',
      'replied, status',
      (query) => {
        return (query as any).eq('id', recipientId).single()
      },
      {
        operation: 'check_recipient_reply',
        recipientId,
      }
    )

    if (!recipientResult.success || !recipientResult.data || recipientResult.data.length === 0) {
      return
    }

    const recipient = recipientResult.data[0]

    // Check if recipient has replied
    if (recipient.replied) {
      // Check if we should stop (campaign-level setting takes precedence, then step-level)
      const campaignStopOnReply =
        campaignResult.success &&
        campaignResult.data &&
        campaignResult.data.length > 0 &&
        campaignResult.data[0].stop_on_reply !== false // Default to true if not set
      const stepStopOnReply = currentStep.stop_on_reply !== false // Default to true if not set

      // If either campaign or step has stop_on_reply enabled, don't schedule next step
      if (campaignStopOnReply || stepStopOnReply) {
        await executeUpdateOperation(
          supabase,
          'campaign_recipients',
          {
            status: 'stopped',
          },
          (query) => (query as any).eq('id', recipientId),
          {
            operation: 'stop_recipient_on_reply',
            recipientId,
          }
        )
        return
      }
    }

    // Get next step
    const nextStepResult = await executeSelectOperation<{
      id: string
      step_number: number
      delay_hours: number
      delay_days: number
      subject: string
      html: string
    }>(
      supabase,
      'campaign_steps',
      'id, step_number, delay_hours, delay_days, subject, html',
      (query) => {
        return (query as any)
          .eq('campaign_id', campaignId)
          .eq('step_number', currentStep.step_number + 1)
          .single()
      },
      {
        operation: 'fetch_next_step',
        campaignId,
        currentStepNumber: currentStep.step_number,
      }
    )

    if (!nextStepResult.success || !nextStepResult.data || nextStepResult.data.length === 0) {
      // No more steps, mark as completed
      await executeUpdateOperation(
        supabase,
        'campaign_recipients',
        {
          status: 'completed',
        },
        (query) => (query as any).eq('id', recipientId),
        {
          operation: 'mark_recipient_completed',
          recipientId,
        }
      )
      return
    }

    const nextStep = nextStepResult.data[0]

    // Calculate next send time
    const now = new Date()
    const delayMs =
      (nextStep.delay_hours || 0) * 60 * 60 * 1000 + (nextStep.delay_days || 0) * 24 * 60 * 60 * 1000
    const nextSendAt = new Date(now.getTime() + delayMs)

    // Get recipient email and user_id for creating email
    const recipientEmailResult = await executeSelectOperation<{ email: string; campaign_id: string }>(
      supabase,
      'campaign_recipients',
      'email, campaign_id',
      (query) => {
        return (query as any).eq('id', recipientId).single()
      },
      {
        operation: 'fetch_recipient_email',
        recipientId,
      }
    )

    if (!recipientEmailResult.success || !recipientEmailResult.data || recipientEmailResult.data.length === 0) {
      return
    }

    const recipientEmail = recipientEmailResult.data[0]

    // Get campaign to get user_id and mailbox_id
    const campaignForEmailResult = await executeSelectOperation<{ user_id: string; mailbox_id: string }>(
      supabase,
      'campaigns',
      'user_id, mailbox_id',
      (query) => {
        return (query as any).eq('id', campaignId).single()
      },
      {
        operation: 'fetch_campaign_for_email',
        campaignId,
      }
    )

    if (!campaignForEmailResult.success || !campaignForEmailResult.data || campaignForEmailResult.data.length === 0) {
      return
    }

    const campaignForEmail = campaignForEmailResult.data[0]

    // Create email record for next step
    await executeInsertOperation(
      supabase,
      'emails',
      {
        user_id: campaignForEmail.user_id,
        mailbox_id: campaignForEmail.mailbox_id,
        campaign_id: campaignId,
        campaign_step_id: nextStep.id,
        campaign_recipient_id: recipientId,
        to_email: recipientEmail.email,
        subject: nextStep.subject,
        html: nextStep.html,
        status: 'queued',
        scheduled_at: nextSendAt.toISOString(),
        direction: 'sent',
        type: 'campaign',
      },
      {
        operation: 'create_next_step_email',
        campaignId,
        recipientId,
        stepId: nextStep.id,
      }
    )

    // Update recipient next_send_at
    await executeUpdateOperation(
      supabase,
      'campaign_recipients',
      {
        next_send_at: nextSendAt.toISOString(),
      },
      (query) => (query as any).eq('id', recipientId),
      {
        operation: 'update_recipient_next_send',
        recipientId,
      }
    )
  } catch (error) {
    console.error('Error scheduling next step:', error)
    // Don't throw - this is a helper function that shouldn't break the main flow
  }
}
