/**
 * Reply Detection for Campaigns
 * Detects when a recipient replies and stops the sequence
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Check if recipient has replied and stop campaign sequence
 */
export async function checkAndStopOnReply(
  recipientId: string,
  campaignId: string,
  supabase?: any
): Promise<{ hasReplied: boolean; shouldStop: boolean }> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { hasReplied: false, shouldStop: false }
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  // Get recipient
  const { data: recipient, error } = await supabase
    .from('campaign_recipients')
    .select('replied, replied_at')
    .eq('id', recipientId)
    .single()

  if (error || !recipient) {
    return { hasReplied: false, shouldStop: false }
  }

  if (recipient.replied) {
    // Check if current step has stop_on_reply enabled
    const { data: currentStep } = await supabase
      .from('campaign_steps')
      .select('stop_on_reply')
      .eq('campaign_id', campaignId)
      .eq('step_number', recipient.current_step_number || 1)
      .single()

    const shouldStop = currentStep?.stop_on_reply !== false // Default to true

    return {
      hasReplied: true,
      shouldStop
    }
  }

  return { hasReplied: false, shouldStop: false }
}

/**
 * Mark recipient as replied
 */
export async function markRecipientReplied(
  recipientId: string,
  replyMessageId: string,
  supabase?: any
): Promise<void> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  await supabase
    .from('campaign_recipients')
    .update({
      replied: true,
      replied_at: new Date().toISOString(),
      reply_message_id: replyMessageId,
      status: 'stopped', // Stop the sequence
      updated_at: new Date().toISOString()
    })
    .eq('id', recipientId)
}

