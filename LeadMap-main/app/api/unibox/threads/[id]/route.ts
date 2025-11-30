import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/unibox/threads/[id]
 * Get detailed thread information including all messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get thread with all messages and participants
    const { data: thread, error: threadError } = await supabase
      .from('email_threads')
      .select(`
        *,
        mailboxes!inner(id, email, display_name, provider),
        email_messages(
          id,
          direction,
          subject,
          snippet,
          body_html,
          body_plain,
          received_at,
          sent_at,
          read,
          in_reply_to,
          email_participants(
            type,
            email,
            name,
            contact_id,
            contacts(id, first_name, last_name, email, phone)
          ),
          email_attachments(
            id,
            filename,
            mime_type,
            size_bytes,
            storage_path
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Get CRM context if linked
    let contact = null
    let listing = null
    let campaign = null

    if (thread.contact_id) {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', thread.contact_id)
        .single()
      contact = data
    }

    if (thread.listing_id) {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('listing_id', thread.listing_id)
        .single()
      listing = data
    }

    if (thread.campaign_id) {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', thread.campaign_id)
        .single()
      campaign = data
    }

    // Sort messages by received_at/sent_at
    const messages = (thread.email_messages || []).sort((a: any, b: any) => {
      const dateA = new Date(a.received_at || a.sent_at || 0).getTime()
      const dateB = new Date(b.received_at || b.sent_at || 0).getTime()
      return dateA - dateB
    })

    return NextResponse.json({
      thread: {
        id: thread.id,
        subject: thread.subject,
        status: thread.status,
        unread: thread.unread,
        starred: thread.starred,
        archived: thread.archived,
        mailbox: {
          id: thread.mailboxes.id,
          email: thread.mailboxes.email,
          display_name: thread.mailboxes.display_name,
          provider: thread.mailboxes.provider
        },
        messages,
        lastMessageAt: thread.last_message_at,
        lastInboundAt: thread.last_inbound_at,
        lastOutboundAt: thread.last_outbound_at,
        contact,
        listing,
        campaign,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/unibox/threads/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/unibox/threads/[id]
 * Update thread (status, unread, starred, archived)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify thread belongs to user
    const { data: existingThread } = await supabase
      .from('email_threads')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingThread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Parse updates
    const body = await request.json()
    const updates: any = {}

    if (body.status !== undefined) {
      updates.status = body.status
    }
    if (body.unread !== undefined) {
      updates.unread = body.unread
    }
    if (body.starred !== undefined) {
      updates.starred = body.starred
    }
    if (body.archived !== undefined) {
      updates.archived = body.archived
    }

    // Update thread
    const { data: thread, error: updateError } = await supabase
      .from('email_threads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating thread:', updateError)
      return NextResponse.json({ error: 'Failed to update thread' }, { status: 500 })
    }

    return NextResponse.json({ thread })

  } catch (error: any) {
    console.error('Error in PATCH /api/unibox/threads/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

