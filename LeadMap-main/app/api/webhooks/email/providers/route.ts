import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordDeliveredEvent, recordBouncedEvent, recordComplaintEvent } from '@/lib/email/event-tracking'

export const runtime = 'nodejs'

/**
 * Provider Email Webhook Handler
 * POST /api/webhooks/email/providers
 * Handles webhook events from email providers (delivered, bounced, complaints)
 * 
 * Supports multiple providers:
 * - SendGrid
 * - Mailgun
 * - Resend
 * - AWS SES
 * - Generic webhook format
 */

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (if configured)
    const webhookSecret = request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const provider = request.headers.get('x-provider') || detectProvider(request, body)

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

    // Process events based on provider
    switch (provider) {
      case 'sendgrid':
        return await handleSendGridWebhook(supabase, body)
      case 'mailgun':
        return await handleMailgunWebhook(supabase, body)
      case 'resend':
        return await handleResendWebhook(supabase, body)
      case 'ses':
        return await handleSESWebhook(supabase, body)
      default:
        return await handleGenericWebhook(supabase, body)
    }
  } catch (error: any) {
    console.error('Provider webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Detect provider from request headers or body format
 */
function detectProvider(request: NextRequest, body: any): string {
  const userAgent = request.headers.get('user-agent') || ''
  
  if (userAgent.includes('SendGrid')) return 'sendgrid'
  if (userAgent.includes('Mailgun')) return 'mailgun'
  if (body.type === 'email.sent' && body.data) return 'resend'
  if (body.Type === 'Notification' && body.Message) return 'ses'
  
  return 'generic'
}

/**
 * Handle SendGrid webhook events
 */
async function handleSendGridWebhook(supabase: any, body: any) {
  const events = Array.isArray(body) ? body : [body]
  const processed = []

  for (const event of events) {
    const { email, event: eventType, sg_message_id, timestamp, reason, status, user_id } = event

    // Find email by provider message ID
    const { data: emailRecord } = await supabase
      .from('emails')
      .select('id, user_id, mailbox_id, campaign_id, campaign_recipient_id, to_email')
      .eq('provider_message_id', sg_message_id || '')
      .single()

    if (!emailRecord) {
      continue // Skip if email not found
    }

    switch (eventType) {
      case 'delivered':
        await recordDeliveredEvent({
          userId: emailRecord.user_id,
          emailId: emailRecord.id,
          mailboxId: emailRecord.mailbox_id || undefined,
          recipientEmail: email || emailRecord.to_email,
          providerMessageId: sg_message_id || undefined
        }).catch(() => {})
        break

      case 'bounce':
      case 'dropped':
        await recordBouncedEvent({
          userId: emailRecord.user_id,
          emailId: emailRecord.id,
          mailboxId: emailRecord.mailbox_id || undefined,
          campaignId: emailRecord.campaign_id || undefined,
          campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
          recipientEmail: email || emailRecord.to_email,
          bounceType: eventType === 'bounce' ? (reason?.includes('550') ? 'hard' : 'soft') : 'hard',
          bounceReason: reason || undefined,
          providerMessageId: sg_message_id || undefined
        }).catch(() => {})
        break

      case 'spamreport':
        await recordComplaintEvent({
          userId: emailRecord.user_id,
          emailId: emailRecord.id,
          mailboxId: emailRecord.mailbox_id || undefined,
          campaignId: emailRecord.campaign_id || undefined,
          campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
          recipientEmail: email || emailRecord.to_email,
          complaintType: 'spam',
          providerMessageId: sg_message_id || undefined
        }).catch(() => {})
        break
    }

    processed.push(eventType)
  }

  return NextResponse.json({ success: true, processed: processed.length })
}

/**
 * Handle Mailgun webhook events
 */
async function handleMailgunWebhook(supabase: any, body: any) {
  const { 'event-data': eventData } = body
  if (!eventData) {
    return NextResponse.json({ error: 'Invalid Mailgun webhook format' }, { status: 400 })
  }

  const { event, message, recipient, reason, severity } = eventData
  const messageId = message?.headers?.['message-id'] || message?.id

  // Find email by message ID or recipient
  let emailRecord: any = null
  if (messageId) {
    const { data } = await supabase
      .from('emails')
      .select('id, user_id, mailbox_id, campaign_id, campaign_recipient_id, to_email')
      .eq('provider_message_id', messageId)
      .single()
    emailRecord = data || null
  }

  if (!emailRecord && recipient) {
    // Try to find by recipient email (less reliable)
    const { data } = await supabase
      .from('emails')
      .select('id, user_id, mailbox_id, campaign_id, campaign_recipient_id, to_email')
      .eq('to_email', recipient.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    emailRecord = data || null
  }

  if (!emailRecord) {
    return NextResponse.json({ success: true, message: 'Email not found' })
  }

  switch (event) {
    case 'delivered':
      await recordDeliveredEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        recipientEmail: recipient || emailRecord.to_email,
        providerMessageId: messageId || undefined
      }).catch(() => {})
      break

    case 'bounced':
    case 'failed':
      await recordBouncedEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail: recipient || emailRecord.to_email,
        bounceType: severity === 'permanent' ? 'hard' : 'soft',
        bounceReason: reason || undefined,
        providerMessageId: messageId || undefined
      }).catch(() => {})
      break

    case 'complained':
      await recordComplaintEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail: recipient || emailRecord.to_email,
        complaintType: 'spam',
        providerMessageId: messageId || undefined
      }).catch(() => {})
      break
  }

  return NextResponse.json({ success: true })
}

/**
 * Handle Resend webhook events
 */
async function handleResendWebhook(supabase: any, body: any) {
  const { type, data } = body

  if (!data?.email_id) {
    return NextResponse.json({ error: 'Missing email_id' }, { status: 400 })
  }

  // Resend uses email_id from their system, need to map to our email ID
  // For now, try to find by recipient email
  const { data: emailRecord } = await supabase
    .from('emails')
    .select('id, user_id, mailbox_id, campaign_id, campaign_recipient_id, to_email')
    .eq('provider_message_id', data.email_id)
    .single()

  if (!emailRecord) {
    return NextResponse.json({ success: true, message: 'Email not found' })
  }

  switch (type) {
    case 'email.delivered':
      await recordDeliveredEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        recipientEmail: data.to || emailRecord.to_email,
        providerMessageId: data.email_id
      }).catch(() => {})
      break

    case 'email.bounced':
      await recordBouncedEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail: data.to || emailRecord.to_email,
        bounceType: data.bounce_type === 'permanent' ? 'hard' : 'soft',
        bounceReason: data.bounce_reason || undefined,
        providerMessageId: data.email_id
      }).catch(() => {})
      break

    case 'email.complained':
      await recordComplaintEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail: data.to || emailRecord.to_email,
        complaintType: 'spam',
        providerMessageId: data.email_id
      }).catch(() => {})
      break
  }

  return NextResponse.json({ success: true })
}

/**
 * Handle AWS SES webhook events (SNS notifications)
 */
async function handleSESWebhook(supabase: any, body: any) {
  // SES sends SNS notifications, need to parse the message
  const message = body.Type === 'Notification' ? JSON.parse(body.Message) : body
  const { eventType, mail, bounce, complaint } = message

  if (!mail?.messageId) {
    return NextResponse.json({ error: 'Missing message ID' }, { status: 400 })
  }

  // Find email by SES message ID
  const { data: emailRecord } = await supabase
    .from('emails')
    .select('id, user_id, mailbox_id, campaign_id, campaign_recipient_id, to_email')
    .eq('provider_message_id', mail.messageId)
    .single()

  if (!emailRecord) {
    return NextResponse.json({ success: true, message: 'Email not found' })
  }

  const recipientEmail = mail.destination?.[0] || emailRecord.to_email

  switch (eventType) {
    case 'Delivery':
      await recordDeliveredEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        recipientEmail,
        providerMessageId: mail.messageId
      }).catch(() => {})
      break

    case 'Bounce':
      await recordBouncedEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail,
        bounceType: bounce.bounceType === 'Permanent' ? 'hard' : 'soft',
        bounceReason: bounce.bounceSubType || undefined,
        bounceSubtype: bounce.bounceSubType || undefined,
        providerMessageId: mail.messageId
      }).catch(() => {})
      break

    case 'Complaint':
      await recordComplaintEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail,
        complaintType: complaint.complaintFeedbackType || 'spam',
        complaintFeedback: complaint.complaintSubType || undefined,
        providerMessageId: mail.messageId
      }).catch(() => {})
      break
  }

  return NextResponse.json({ success: true })
}

/**
 * Handle generic webhook format
 * Expected format:
 * {
 *   eventType: 'delivered' | 'bounced' | 'complaint',
 *   emailId: UUID,
 *   recipientEmail: string,
 *   providerMessageId?: string,
 *   bounceType?: 'hard' | 'soft',
 *   bounceReason?: string
 * }
 */
async function handleGenericWebhook(supabase: any, body: any) {
  const { eventType, emailId, recipientEmail, providerMessageId, bounceType, bounceReason, complaintType } = body

  if (!eventType || !emailId || !recipientEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get email record
  const { data: emailRecord } = await supabase
    .from('emails')
    .select('id, user_id, mailbox_id, campaign_id, campaign_recipient_id')
    .eq('id', emailId)
    .single()

  if (!emailRecord) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  switch (eventType) {
    case 'delivered':
      await recordDeliveredEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        recipientEmail,
        providerMessageId
      }).catch(() => {})
      break

    case 'bounced':
      await recordBouncedEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail,
        bounceType: bounceType || 'soft',
        bounceReason,
        providerMessageId
      }).catch(() => {})
      break

    case 'complaint':
      await recordComplaintEvent({
        userId: emailRecord.user_id,
        emailId: emailRecord.id,
        mailboxId: emailRecord.mailbox_id || undefined,
        campaignId: emailRecord.campaign_id || undefined,
        campaignRecipientId: emailRecord.campaign_recipient_id || undefined,
        recipientEmail,
        complaintType: complaintType || 'spam',
        providerMessageId
      }).catch(() => {})
      break
  }

  return NextResponse.json({ success: true })
}

