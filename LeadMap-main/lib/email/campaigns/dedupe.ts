/**
 * Campaign Deduplication Logic
 * Prevents the same lead from being enrolled in multiple campaigns simultaneously
 */

import { createClient } from '@supabase/supabase-js'

export interface DedupeCheck {
  allowed: boolean
  reason?: string
  existingCampaigns?: string[]
}

/**
 * Check if email can be enrolled in campaign (dedupe check)
 */
export async function checkCampaignDedupe(
  email: string,
  campaignId: string,
  userId: string,
  supabase?: any
): Promise<DedupeCheck> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        allowed: true, // Allow if we can't check
        reason: 'Dedupe check unavailable'
      }
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  // Check for existing active enrollments
  const { data: existingEnrollments, error } = await supabase
    .from('campaign_recipients')
    .select(`
      campaign_id,
      status,
      campaigns!inner(
        id,
        name,
        status,
        user_id
      )
    `)
    .eq('email', email.toLowerCase())
    .in('status', ['pending', 'queued', 'in_progress'])
    .eq('campaigns.user_id', userId)

  if (error) {
    console.warn('Dedupe check error:', error)
    return {
      allowed: true, // Allow if check fails
      reason: 'Dedupe check failed'
    }
  }

  // Filter out the current campaign
  const otherCampaigns = existingEnrollments?.filter(
    (e: any) => e.campaign_id !== campaignId && e.campaigns?.status !== 'completed' && e.campaigns?.status !== 'cancelled'
  ) || []

  if (otherCampaigns.length > 0) {
    const campaignNames = otherCampaigns.map((e: any) => e.campaigns?.name || 'Unknown').join(', ')
    return {
      allowed: false,
      reason: `Email is already enrolled in active campaign(s): ${campaignNames}`,
      existingCampaigns: otherCampaigns.map((e: any) => e.campaign_id)
    }
  }

  return {
    allowed: true
  }
}

/**
 * Generate dedupe hash for recipient
 */
export function generateDedupeHash(email: string, campaignType?: string): string {
  const crypto = require('crypto')
  const hashInput = `${email.toLowerCase()}_${campaignType || 'default'}`
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)
}

