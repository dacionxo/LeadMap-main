import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Email Click Tracking with Clean URLs
 * GET /r/:eventId
 * Redirects to tracked URL and logs click event
 * 
 * Event ID format: base64(email_id||recipient_id||campaign_id||url)
 * or UUID stored in a separate tracking_links table
 */

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      // Try to decode URL from eventId if database unavailable
      try {
        const decoded = Buffer.from(eventId, 'base64').toString('utf-8')
        const parts = decoded.split('||')
        if (parts.length >= 4) {
          return NextResponse.redirect(parts[3]) // Redirect to URL
        }
      } catch {
        // Fall through to error
      }
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Try to find tracking link by eventId
    // Option 1: Look in tracking_links table if it exists
    const { data: trackingLink } = await supabase
      .from('email_tracking_links')
      .select('*')
      .eq('event_id', eventId)
      .single()
      .catch(() => ({ data: null }))

    if (trackingLink) {
      const { url, email_id, campaign_recipient_id, campaign_id } = trackingLink
      
      // Record click event
      await recordClickEvent(
        supabase,
        url,
        email_id,
        campaign_recipient_id,
        campaign_id,
        request
      ).catch(() => {})

      return NextResponse.redirect(url)
    }

    // Option 2: Decode from base64 eventId (backwards compatible)
    try {
      const decoded = Buffer.from(eventId, 'base64').toString('utf-8')
      const parts = decoded.split('||')
      
      if (parts.length >= 4) {
        const [emailId, recipientId, campaignId, url] = parts
        
        // Record click event
        await recordClickEvent(
          supabase,
          url,
          emailId || null,
          recipientId || null,
          campaignId || null,
          request
        ).catch(() => {})

        return NextResponse.redirect(url)
      }
    } catch {
      // Invalid base64, continue to error
    }

    // Event ID not found
    return NextResponse.json({ error: 'Invalid tracking link' }, { status: 404 })

  } catch (error: any) {
    console.error('Click redirect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function recordClickEvent(
  supabase: any,
  url: string,
  emailId: string | null,
  recipientId: string | null,
  campaignId: string | null,
  request: NextRequest
) {
  // Get email and campaign data for context
  let recipientEmail: string | null = null
  let userId: string | null = null
  let mailboxId: string | null = null
  let campaignStepId: string | null = null
  let contactId: string | null = null

  if (emailId) {
    const { data } = await supabase
      .from('emails')
      .select('user_id, mailbox_id, to_email, campaign_step_id, contact_id')
      .eq('id', emailId)
      .single()
      .catch(() => ({ data: null }))
    
    if (data) {
      recipientEmail = data.to_email
      userId = data.user_id
      mailboxId = data.mailbox_id
      campaignStepId = data.campaign_step_id
      contactId = data.contact_id
    }
  }

  if (recipientId && !recipientEmail) {
    const { data } = await supabase
      .from('campaign_recipients')
      .select('email, campaign:campaigns(user_id, mailbox_id), campaign_step_id, contact_id')
      .eq('id', recipientId)
      .single()
      .catch(() => ({ data: null }))
    
    if (data) {
      recipientEmail = data.email
      userId = data.campaign?.user_id || null
      mailboxId = data.campaign?.mailbox_id || null
      campaignStepId = data.campaign_step_id || null
      contactId = data.contact_id || null
    }
  }

  if (recipientEmail && userId) {
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      request.headers.get('x-real-ip') || null
    const userAgent = request.headers.get('user-agent') || null

    // Use the record_email_event function for unified tracking
    await supabase.rpc('record_email_event', {
      p_user_id: userId,
      p_event_type: 'clicked',
      p_email_id: emailId || null,
      p_mailbox_id: mailboxId || null,
      p_campaign_id: campaignId || null,
      p_campaign_recipient_id: recipientId || null,
      p_campaign_step_id: campaignStepId || null,
      p_recipient_email: recipientEmail,
      p_contact_id: contactId || null,
      p_event_timestamp: new Date().toISOString(),
      p_metadata: JSON.stringify({
        source: 'click_redirect',
        device_type: userAgent ? (userAgent.includes('Mobile') ? 'mobile' : 'desktop') : null
      }),
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_clicked_url: url
    }).catch(() => {})

    // Also update legacy tables for backwards compatibility
    if (emailId) {
      await supabase
        .from('emails')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', emailId)
        .catch(() => {})
    }

    if (recipientId) {
      await supabase
        .from('campaign_recipients')
        .update({ clicked: true, clicked_at: new Date().toISOString() })
        .eq('id', recipientId)
        .catch(() => {})
    }
  }
}

