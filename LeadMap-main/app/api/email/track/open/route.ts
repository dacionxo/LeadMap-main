import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Email Open Tracking
 * GET /api/email/track/open?email_id=...&recipient_id=...&event_id=...
 * Tracks email opens via 1x1 pixel image
 * Now uses unified email_events table with deduplication support
 */

export const runtime = 'edge' // Fast response for tracking pixel

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('email_id')
    const recipientId = searchParams.get('recipient_id')
    const campaignId = searchParams.get('campaign_id')
    const eventId = searchParams.get('event_id') // Optional: pre-generated event ID

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey && (emailId || recipientId)) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      // Get email and campaign data for context
      let emailData: any = null
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
          emailData = data
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
        const { data: eventResult, error: eventError } = await supabase.rpc('record_email_event', {
          p_user_id: userId,
          p_event_type: 'opened',
          p_email_id: emailId || null,
          p_mailbox_id: mailboxId || null,
          p_campaign_id: campaignId || null,
          p_campaign_recipient_id: recipientId || null,
          p_campaign_step_id: campaignStepId || null,
          p_recipient_email: recipientEmail,
          p_contact_id: contactId || null,
          p_event_timestamp: new Date().toISOString(),
          p_metadata: JSON.stringify({
            source: 'tracking_pixel',
            device_type: userAgent ? (userAgent.includes('Mobile') ? 'mobile' : 'desktop') : null
          }),
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        }).catch(() => ({ data: null, error: null }))

        // Also update legacy tables for backwards compatibility
        if (emailId) {
          await supabase
            .from('emails')
            .update({ opened_at: new Date().toISOString() })
            .eq('id', emailId)
            .catch(() => {})

          // Also write to legacy email_opens table if it exists
          await supabase
            .from('email_opens')
            .insert({
              email_id: emailId,
              campaign_recipient_id: recipientId || null,
              campaign_id: campaignId || null,
              opened_at: new Date().toISOString(),
              ip_address: ipAddress,
              user_agent: userAgent
            })
            .catch(() => {}) // Ignore if table doesn't exist
        }

        if (recipientId) {
          await supabase
            .from('campaign_recipients')
            .update({ opened: true, opened_at: new Date().toISOString() })
            .eq('id', recipientId)
            .catch(() => {})
        }
      }
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error: any) {
    console.error('Open tracking error:', error)
    // Return pixel even on error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    return new NextResponse(pixel, {
      status: 200,
      headers: { 'Content-Type': 'image/gif' }
    })
  }
}

