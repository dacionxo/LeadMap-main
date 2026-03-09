/**
 * Symphony EmailMessage Handler
 * Processes EmailMessage messages by sending via sendViaMailbox
 */

import type { Message, MessageHandler, HandlerContext } from '@/lib/types/symphony'
import type { EmailMessagePayload } from '../utils/message-builders'
import type { Mailbox, EmailPayload } from '@/lib/email/types'
import { sendViaMailbox } from '@/lib/email/sendViaMailbox'
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
  }
}
