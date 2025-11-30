import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { sendViaMailbox } from '@/lib/email/sendViaMailbox'

export const runtime = 'nodejs'

/**
 * POST /api/unibox/threads/[id]/forward
 * Forward a thread or specific message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get thread
    const { data: thread, error: threadError } = await supabase
      .from('email_threads')
      .select(`
        *,
        mailboxes!inner(*),
        email_messages(
          id,
          direction,
          subject,
          body_html,
          body_plain,
          email_participants(type, email, name)
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const {
      mailboxId,
      to,
      subject,
      bodyHtml,
      bodyText,
      messageId = null  // Optional: forward specific message, otherwise forward all
    } = body

    if (!mailboxId || !to) {
      return NextResponse.json(
        { error: 'Mailbox ID and recipient(s) are required' },
        { status: 400 }
      )
    }

    // Find mailbox
    const mailbox = (thread.mailboxes as any[]).find((m: any) => m.id === mailboxId)
    if (!mailbox) {
      return NextResponse.json({ error: 'Mailbox not found in thread' }, { status: 404 })
    }

    // Get messages to forward
    const messages = (thread.email_messages || []) as any[]
    let messagesToForward = messages

    if (messageId) {
      const specificMessage = messages.find((m: any) => m.id === messageId)
      if (!specificMessage) {
        return NextResponse.json({ error: 'Message not found in thread' }, { status: 404 })
      }
      messagesToForward = [specificMessage]
    }

    // Sort messages chronologically
    messagesToForward = messagesToForward.sort((a: any, b: any) => {
      const dateA = new Date(a.received_at || a.sent_at || 0).getTime()
      const dateB = new Date(b.received_at || b.sent_at || 0).getTime()
      return dateA - dateB
    })

    // Build forwarded content
    const forwardedContent = messagesToForward.map((msg: any) => {
      const participants = (msg.email_participants || []).map((p: any) => {
        const name = p.name || p.email
        return `${name} <${p.email}>`
      }).join(', ')

      const date = new Date(msg.received_at || msg.sent_at).toLocaleString()
      const body = msg.body_html || msg.body_plain?.replace(/\n/g, '<br>') || ''

      return `
        <div style="border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em;">
          <p><strong>From:</strong> ${participants}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Subject:</strong> ${msg.subject || '(No Subject)'}</p>
          <div>${body}</div>
        </div>
      `
    }).join('<hr>')

    // Build subject
    const forwardSubject = subject || `Fwd: ${thread.subject || '(No Subject)'}`

    // Build body
    const customBody = bodyHtml || bodyText?.replace(/\n/g, '<br>') || ''
    const finalBodyHtml = customBody
      ? `${customBody}<br><br>---------- Forwarded message ----------<br>${forwardedContent}`
      : `---------- Forwarded message ----------<br>${forwardedContent}`

    // Send email via mailbox
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const fullMailbox = await supabaseAdmin
      .from('mailboxes')
      .select('*')
      .eq('id', mailboxId)
      .eq('user_id', user.id)
      .single()

    if (!fullMailbox.data) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })
    }

    // Send forward
    const sendResult = await sendViaMailbox(fullMailbox.data, {
      to,
      subject: forwardSubject,
      html: finalBodyHtml,
      fromName: fullMailbox.data.from_name || fullMailbox.data.display_name,
      fromEmail: fullMailbox.data.from_email || fullMailbox.data.email
    })

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send forward' },
        { status: 500 }
      )
    }

    // Create new thread for forwarded message (or log to original thread?)
    // For now, we'll log as outbound in original thread
    const { data: outboundMessage, error: messageError } = await supabase
      .from('email_messages')
      .insert({
        thread_id: id,
        user_id: user.id,
        mailbox_id: mailboxId,
        direction: 'outbound',
        provider_message_id: sendResult.providerMessageId || `temp-${Date.now()}`,
        subject: forwardSubject,
        snippet: bodyText?.substring(0, 200) || bodyHtml?.replace(/<[^>]*>/g, '').substring(0, 200) || 'Forwarded message',
        body_html: finalBodyHtml,
        body_plain: bodyText || bodyHtml?.replace(/<[^>]*>/g, '') || forwardedContent.replace(/<[^>]*>/g, ''),
        sent_at: new Date().toISOString(),
        read: true
      })
      .select()
      .single()

    // Insert participants for forwarded message
    if (outboundMessage) {
      const toEmails = to.split(',').map((email: string) => email.trim())
      
      await supabase
        .from('email_participants')
        .insert([
          { message_id: outboundMessage.id, type: 'from', email: fullMailbox.data.email, name: fullMailbox.data.display_name || null },
          ...toEmails.map((email: string) => ({ message_id: outboundMessage.id, type: 'to', email, name: null }))
        ])
    }

    // Update thread
    await supabase
      .from('email_threads')
      .update({
        status: 'open'
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      message: outboundMessage,
      providerMessageId: sendResult.providerMessageId
    })

  } catch (error: any) {
    console.error('Error in POST /api/unibox/threads/[id]/forward:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

