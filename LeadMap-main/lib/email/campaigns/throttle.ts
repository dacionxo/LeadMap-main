/**
 * Campaign Throttling Logic
 * Per-campaign rate limiting and daily caps
 */

import { createClient } from '@supabase/supabase-js'

export interface ThrottleCheck {
  allowed: boolean
  reason?: string
  remainingDaily?: number
  remainingHourly?: number
  remainingTotal?: number
}

/**
 * Check campaign throttling limits
 */
export async function checkCampaignThrottle(
  campaignId: string,
  supabase?: any
): Promise<ThrottleCheck> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { allowed: true } // Allow if we can't check
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  // Get campaign limits
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('daily_cap, hourly_cap, total_cap')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) {
    return { allowed: true } // Allow if campaign not found
  }

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Count emails sent for this campaign
  const { data: campaignEmails } = await supabase
    .from('emails')
    .select('sent_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
    .not('sent_at', 'is', null)

  const hourlyCount = campaignEmails?.filter((e: any) => 
    e.sent_at && new Date(e.sent_at) >= oneHourAgo
  ).length || 0

  const dailyCount = campaignEmails?.filter((e: any) => 
    e.sent_at && new Date(e.sent_at) >= oneDayAgo
  ).length || 0

  const totalCount = campaignEmails?.length || 0

  // Check hourly cap
  if (campaign.hourly_cap && hourlyCount >= campaign.hourly_cap) {
    return {
      allowed: false,
      reason: `Hourly cap reached: ${hourlyCount}/${campaign.hourly_cap}`,
      remainingHourly: 0,
      remainingDaily: campaign.daily_cap ? Math.max(0, campaign.daily_cap - dailyCount) : undefined,
      remainingTotal: campaign.total_cap ? Math.max(0, campaign.total_cap - totalCount) : undefined
    }
  }

  // Check daily cap
  if (campaign.daily_cap && dailyCount >= campaign.daily_cap) {
    return {
      allowed: false,
      reason: `Daily cap reached: ${dailyCount}/${campaign.daily_cap}`,
      remainingHourly: campaign.hourly_cap ? Math.max(0, campaign.hourly_cap - hourlyCount) : undefined,
      remainingDaily: 0,
      remainingTotal: campaign.total_cap ? Math.max(0, campaign.total_cap - totalCount) : undefined
    }
  }

  // Check total cap
  if (campaign.total_cap && totalCount >= campaign.total_cap) {
    return {
      allowed: false,
      reason: `Total cap reached: ${totalCount}/${campaign.total_cap}`,
      remainingHourly: campaign.hourly_cap ? Math.max(0, campaign.hourly_cap - hourlyCount) : undefined,
      remainingDaily: campaign.daily_cap ? Math.max(0, campaign.daily_cap - dailyCount) : undefined,
      remainingTotal: 0
    }
  }

  return {
    allowed: true,
    remainingHourly: campaign.hourly_cap ? campaign.hourly_cap - hourlyCount : undefined,
    remainingDaily: campaign.daily_cap ? campaign.daily_cap - dailyCount : undefined,
    remainingTotal: campaign.total_cap ? campaign.total_cap - totalCount : undefined
  }
}

