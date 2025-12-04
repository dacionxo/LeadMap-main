import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { sendViaMailbox } from '@/lib/email/sendViaMailbox'
import { Mailbox, EmailPayload } from '@/lib/email/types'
import { getUserEmailSettings, appendComplianceFooter, getUnsubscribeUrl } from '@/lib/email/email-settings'

/**
 * Send Campaign API
 * POST: Send a campaign to all recipients
 * 
 * NOTE: This route uses the OLD email_campaigns table for backward compatibility.
 * For new campaigns, use /api/campaigns/[id]/send instead.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch campaign from OLD email_campaigns table (backward compatibility)
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Parse recipient_ids
    let recipientIds: string[] = []
    if (campaign.recipient_ids) {
      if (typeof campaign.recipient_ids === 'string') {
        recipientIds = JSON.parse(campaign.recipient_ids)
      } else {
        recipientIds = campaign.recipient_ids
      }
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipients selected' }, { status: 400 })
    }

    // Fetch contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, email')
      .in('id', recipientIds)
      .eq('user_id', user.id)

    if (contactsError || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'No valid contacts found' }, { status: 400 })
    }

    // Get mailbox using service role (to access tokens)
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

    // Find mailbox
    const { data: mailbox, error: mailboxError } = await supabaseAdmin
      .from('mailboxes')
      .select('*')
      .eq('email', campaign.sender_email)
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json({ error: 'Mailbox not found or inactive' }, { status: 404 })
    }

    // Get user's email settings for branding/compliance (with fallback on error)
    let emailSettings
    try {
      emailSettings = await getUserEmailSettings(user.id, supabaseAdmin)
    } catch (error) {
      console.warn('Error fetching email settings, using defaults:', error)
      // Use default settings if fetch fails
      emailSettings = {
        from_name: 'LeadMap',
        reply_to: undefined,
        default_footer_html: '',
        unsubscribe_footer_html: '',
        physical_address: undefined,
        transactional_provider: undefined,
        transactional_from_email: undefined
      }
    }

    // Send emails to all recipients using consolidated sendViaMailbox
    const emailPromises = contacts.map(async (contact: { id: string; email: string }) => {
      // Append compliance footer (unsubscribe + physical address)
      const unsubscribeUrl = getUnsubscribeUrl(user.id, contact.id)
      let htmlContent = campaign.html_content || ''
      htmlContent = appendComplianceFooter(htmlContent, emailSettings, unsubscribeUrl)

      const emailPayload: EmailPayload = {
        to: contact.email,
        subject: campaign.subject,
        html: htmlContent,
        fromName: campaign.sender_name || emailSettings.from_name,
        fromEmail: campaign.sender_email
      }

      let sendResult
      try {
        sendResult = await sendViaMailbox(mailbox as Mailbox, emailPayload, supabaseAdmin)
      } catch (error: any) {
        console.error(`Error sending email to ${contact.email}:`, error)
        // Return a failed result instead of throwing
        sendResult = {
          success: false,
          error: error.message || 'Failed to send email'
        }
      }

      // Log email in emails table
      await supabase
        .from('emails')
        .insert({
          user_id: user.id,
          mailbox_id: mailbox.id,
          campaign_id: campaign.id,
          to_email: contact.email,
          subject: campaign.subject,
          html: htmlContent,
          status: sendResult.success ? 'sent' : 'failed',
          sent_at: sendResult.success ? new Date().toISOString() : null,
          provider_message_id: sendResult.providerMessageId || null,
          error: sendResult.error || null,
          direction: 'sent'
        })

      return sendResult
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: contacts.length,
    })
  } catch (error: any) {
    console.error('Send campaign error:', error)
    // Always return JSON, never HTML
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

