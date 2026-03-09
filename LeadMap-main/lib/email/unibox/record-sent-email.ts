/**
 * Record sent email to Unibox (email_threads + email_messages)
 * Ensures scheduled/compose emails appear in the Sent tab of /dashboard/unibox
 */

export interface RecordSentEmailParams {
  supabase: any
  userId: string
  mailboxId: string
  subject: string
  html: string
  toEmail: string | string[]
  fromEmail: string
  fromName?: string | null
  providerMessageId?: string | null
  providerThreadId: string
  sentAt: string
}

/**
 * Creates email_thread + email_message so sent emails appear in Unibox Sent folder
 * Call after successful sendViaMailbox for scheduled or compose emails
 */
export async function recordSentEmailToUnibox(params: RecordSentEmailParams): Promise<void> {
  const {
    supabase,
    userId,
    mailboxId,
    subject,
    html,
    toEmail,
    fromEmail,
    fromName,
    providerMessageId,
    providerThreadId,
    sentAt,
  } = params

  const toEmails = Array.isArray(toEmail)
    ? toEmail
    : typeof toEmail === 'string'
      ? toEmail.split(',').map((e) => e.trim()).filter(Boolean)
      : []

  const snippet =
    (html || '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200) || '(No preview)'

  const { data: newThread, error: threadError } = await (supabase as any)
    .from('email_threads')
    .insert({
      user_id: userId,
      mailbox_id: mailboxId,
      provider_thread_id: providerThreadId,
      subject: subject || '(No Subject)',
      last_message_at: sentAt,
      last_outbound_at: sentAt,
      status: 'open',
      unread: false,
    })
    .select('id')
    .single()

  if (threadError || !newThread) {
    console.warn('[recordSentEmailToUnibox] Failed to create email_thread:', threadError)
    return
  }

  const { data: newMessage, error: messageError } = await (supabase as any)
    .from('email_messages')
    .insert({
      thread_id: newThread.id,
      user_id: userId,
      mailbox_id: mailboxId,
      direction: 'outbound',
      provider_message_id: providerMessageId || providerThreadId,
      subject: subject || '(No Subject)',
      snippet,
      body_html: html || null,
      body_plain: (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null,
      sent_at: sentAt,
      read: true,
    })
    .select('id')
    .single()

  if (!messageError && newMessage) {
    const participants: Array<{ message_id: string; type: string; email: string; name: string | null }> = [
      { message_id: newMessage.id, type: 'from', email: fromEmail, name: fromName || null },
      ...toEmails.map((email: string) => ({ message_id: newMessage.id, type: 'to', email, name: null })),
    ]
    for (const p of participants) {
      await (supabase as any).from('email_participants').insert({
        message_id: p.message_id,
        type: p.type,
        email: p.email,
        name: p.name,
      })
    }
  }
}
