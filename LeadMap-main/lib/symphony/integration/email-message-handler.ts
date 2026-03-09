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
      // Idempotency: if already sent, skip
      const { data: existing } = await (supabase as any)
        .from('email_queue')
        .select('status, processed_at')
        .eq('id', queueId)
        .single()
      if (existing?.status === 'sent') return

      // Atomic claim: only one handler can win (prevents triple-send race)
      // UPDATE ... WHERE processed_at IS NULL - first handler sets it, others get 0 rows
      const { data: claimed, error: claimError } = await (supabase as any)
        .from('email_queue')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', queueId)
        .in('status', ['queued', 'processing'])
        .is('processed_at', null)
        .select('id')
        .maybeSingle()
      if (claimError || !claimed) return // Another handler already claimed or row not found
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

    const emailPayload: EmailPayload = {
      to: payload.toEmail,
      subject: payload.subject,
      html: payload.html,
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
