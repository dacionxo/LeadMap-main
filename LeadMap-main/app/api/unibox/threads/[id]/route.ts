import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

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
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get thread with all messages and participants
    // CRITICAL: Use maybeSingle() instead of single() to prevent PGRST116 errors
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
      .maybeSingle()

    if (threadError) {
      console.error(`[GET /api/unibox/threads/[id]] Database error:`, {
        error: threadError,
        threadId: id,
        userId: user.id,
        errorCode: (threadError as any)?.code,
        errorMessage: threadError.message
      })
      return NextResponse.json({ 
        error: 'Failed to fetch thread',
        details: process.env.NODE_ENV === 'development' ? threadError.message : undefined
      }, { status: 500 })
    }

    if (!thread) {
      console.warn(`[GET /api/unibox/threads/[id]] Thread not found:`, {
        threadId: id,
        userId: user.id
      })
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Get CRM context if linked
    let contact = null
    let listing = null
    let campaign = null

    if (thread.contact_id) {
      const { data, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', thread.contact_id)
        .maybeSingle()
      if (!contactError) {
        contact = data
      }
    }

    if (thread.listing_id) {
      const { data, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', thread.listing_id)
        .maybeSingle()
      if (!listingError) {
        listing = data
      }
    }

    if (thread.campaign_id) {
      const { data, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', thread.campaign_id)
        .maybeSingle()
      if (!campaignError) {
        campaign = data
      }
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
    console.error('[GET /api/unibox/threads/[id]] Unhandled exception:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
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
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    
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

