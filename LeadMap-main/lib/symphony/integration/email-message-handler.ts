/**
 * Symphony EmailMessage Handler
 * Processes EmailMessage messages by sending via sendViaMailbox
 */

import type { Message, MessageHandler, HandlerContext } from '@/lib/types/symphony'
import type { EmailMessagePayload } from '../utils/message-builders'
import type { Mailbox, EmailPayload } from '@/lib/email/types'
import { sendViaMailbox } from '@/lib/email/sendViaMailbox'
import { recordSentEmailToUnibox } from '@/lib/email/unibox/record-sent-email'
import { HandlerError } from '../errors'
import { getServiceRoleClient } from '@/lib/supabase-singleton'
import { stripArtifactsFromHtml } from '@/lib/email/sanitize-preview'

/**
 * EmailMessage handler - sends scheduled/queued emails via mailbox
 */
export class EmailMessageHandler implements MessageHandler {
  type = 'EmailMessage'

  async handle(message: Message, context: HandlerContext): Promise<void> {
    if (message.type !== 'EmailMessage') {
      throw new HandlerError(
        `Handler expects EmailMessage, got ${message.type}`,
        false
      )
    }

    const payload = message.payload as unknown as EmailMessagePayload

    if (!payload.mailboxId || !payload.userId || !payload.toEmail || !payload.subject || !payload.html) {
      throw new HandlerError('Invalid email message payload: mailboxId, userId, toEmail, subject, html required', false)
    }

    const supabase = getServiceRoleClient()

    const queueId = payload.emailId
    if (queueId) {
      // Atomic claim: only one handler can send (prevents triple-send when message is delivered multiple times).
      // First handler to set processed_at wins; others get 0 rows and skip.
      const claimNow = new Date().toISOString()
      const { data: claimed, error: claimError } = await (supabase as any)
        .from('email_queue')
        .update({ processed_at: claimNow })
        .eq('id', queueId)
        .in('status', ['queued', 'processing'])
        .is('processed_at', null)
        .select('id')
        .maybeSingle()
      if (claimError || !claimed) return
    }

    const { data: mailbox, error: mailboxError } = await supabase
      .from('mailboxes')
      .select('*')
      .eq('id', payload.mailboxId)
      .eq('user_id', payload.userId)
      .single()

    if (mailboxError || !mailbox) {
      throw new HandlerError(
        `Mailbox not found: ${payload.mailboxId} for user ${payload.userId}`,
        false
      )
    }

    const mailboxData = mailbox as Mailbox
    if (!mailboxData.active) {
      throw new HandlerError(`Mailbox ${payload.mailboxId} is not active`, false)
    }

    // Re-check right before send: another handler may have sent already (race)
    if (queueId) {
      const { data: recheck } = await (supabase as any)
        .from('email_queue')
        .select('status')
        .eq('id', queueId)
        .single()
      if (recheck?.status === 'sent') return
    }

    const emailPayload: EmailPayload = {
      to: payload.toEmail,
      subject: payload.subject,
      html: stripArtifactsFromHtml(payload.html),
      fromName: payload.fromName,
      fromEmail: payload.fromEmail,
    }

    const result = await sendViaMailbox(mailboxData, emailPayload, supabase)

    if (!result.success) {
      throw new HandlerError(
        result.error || 'Failed to send email',
        true
      )
    }

    const sentAt = new Date().toISOString()

    // Record to Unibox so sent email appears in Sent tab
    await recordSentEmailToUnibox({
      supabase,
      userId: payload.userId,
      mailboxId: payload.mailboxId,
      subject: payload.subject,
      html: payload.html,
      toEmail: payload.toEmail,
      fromEmail: payload.fromEmail || mailboxData.from_email || mailboxData.email,
      fromName: payload.fromName || mailboxData.from_name || mailboxData.display_name,
      providerMessageId: result.providerMessageId,
      providerThreadId: queueId ? `scheduled-${queueId}` : `symphony-${Date.now()}`,
      sentAt,
    })

    // Mark email_queue as sent so item is removed from Scheduled tab
    if (queueId) {
      await (supabase as any)
        .from('email_queue')
        .update({
          status: 'sent',
          processed_at: sentAt,
        })
        .eq('id', queueId)
    }
  }
}
