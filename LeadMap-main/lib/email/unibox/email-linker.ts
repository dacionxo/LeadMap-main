/**
 * Email CRM Linking Service
 * Matches emails to contacts, listings, campaigns, and other CRM entities
 */

import { createClient } from '@supabase/supabase-js'

export interface EmailLinkResult {
  contactId?: string
  listingId?: string
  campaignId?: string
  campaignRecipientId?: string
}

/**
 * Link an email message to CRM entities
 */
export async function linkEmailToCRM(
  messageId: string,
  userId: string,
  parsedMessage: {
    from: { email: string; name: string }
    to: Array<{ email: string; name: string }>
    inReplyTo: string | null
    references: string[]
  }
): Promise<EmailLinkResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return {}
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const result: EmailLinkResult = {}

  try {
    // 1. Match participants to contacts
    const allEmails = [
      parsedMessage.from.email,
      ...parsedMessage.to.map(t => t.email)
    ].filter(Boolean)

    for (const email of allEmails) {
      if (!email) continue

      // Try to find in contacts table
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', userId)
        .eq('email', email.toLowerCase())
        .single()

      if (contact) {
        result.contactId = contact.id
        
        // Update participant with contact_id
        await supabase
          .from('email_participants')
          .update({ contact_id: contact.id })
          .eq('message_id', messageId)
          .eq('email', email.toLowerCase())
        
        break
      }

      // Try to find in listings (owner_email)
      const { data: listing } = await supabase
        .from('listings')
        .select('listing_id')
        .ilike('owner_email', email.toLowerCase())
        .limit(1)
        .single()

      if (listing) {
        result.listingId = listing.listing_id
      }
    }

    // 2. Match reply to outbound campaign email
    if (parsedMessage.inReplyTo || parsedMessage.references.length > 0) {
      const messageIds = [
        parsedMessage.inReplyTo,
        ...parsedMessage.references
      ].filter(Boolean) as string[]

      for (const msgId of messageIds) {
        // Find sent email with this provider_message_id
        const { data: sentEmail } = await supabase
          .from('emails')
          .select('campaign_id, campaign_recipient_id')
          .eq('user_id', userId)
          .eq('provider_message_id', msgId)
          .single()

        if (sentEmail) {
          if (sentEmail.campaign_id) {
            result.campaignId = sentEmail.campaign_id
          }
          if (sentEmail.campaign_recipient_id) {
            result.campaignRecipientId = sentEmail.campaign_recipient_id

            // Mark recipient as replied
            await supabase
              .from('campaign_recipients')
              .update({ 
                status: 'replied',
                replied_at: new Date().toISOString()
              })
              .eq('id', sentEmail.campaign_recipient_id)
          }
          break
        }

        // Also check email_messages for outbound messages
        const { data: outboundMessage } = await supabase
          .from('email_messages')
          .select(`
            thread_id,
            email_threads!inner(campaign_id, campaign_recipient_id)
          `)
          .eq('user_id', userId)
          .eq('direction', 'outbound')
          .contains('raw_headers', [{ name: 'Message-ID', value: msgId }])
          .single()

        if (outboundMessage && (outboundMessage as any).email_threads) {
          const thread = (outboundMessage as any).email_threads
          if (thread.campaign_id) {
            result.campaignId = thread.campaign_id
          }
          if (thread.campaign_recipient_id) {
            result.campaignRecipientId = thread.campaign_recipient_id
          }
          break
        }
      }
    }

    // 3. Update thread with CRM links
    const { data: message } = await supabase
      .from('email_messages')
      .select('thread_id')
      .eq('id', messageId)
      .single()

    if (message && (result.contactId || result.listingId || result.campaignId)) {
      const updates: any = {}
      if (result.contactId) updates.contact_id = result.contactId
      if (result.listingId) updates.listing_id = result.listingId
      if (result.campaignId) updates.campaign_id = result.campaignId
      if (result.campaignRecipientId) updates.campaign_recipient_id = result.campaignRecipientId

      await supabase
        .from('email_threads')
        .update(updates)
        .eq('id', message.thread_id)
    }

    return result

  } catch (error: any) {
    console.error('Error linking email to CRM:', error)
    return result
  }
}

/**
 * Bulk link participants to contacts
 */
export async function linkParticipantsToContacts(
  participantIds: string[],
  userId: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey || participantIds.length === 0) {
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // Get all participants with emails
    const { data: participants } = await supabase
      .from('email_participants')
      .select('id, email')
      .in('id', participantIds)
      .not('email', 'is', null)

    if (!participants) return

    // Batch match emails to contacts
    const emails = participants.map(p => p.email.toLowerCase())
    
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email')
      .eq('user_id', userId)
      .in('email', emails)

    if (!contacts) return

    // Create email -> contact_id map
    const emailToContactId = new Map<string, string>()
    contacts.forEach(c => {
      emailToContactId.set(c.email.toLowerCase(), c.id)
    })

    // Update participants
    for (const participant of participants) {
      const contactId = emailToContactId.get(participant.email.toLowerCase())
      if (contactId) {
        await supabase
          .from('email_participants')
          .update({ contact_id: contactId })
          .eq('id', participant.id)
      }
    }

  } catch (error: any) {
    console.error('Error linking participants to contacts:', error)
  }
}

