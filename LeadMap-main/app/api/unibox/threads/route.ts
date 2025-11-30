import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/unibox/threads
 * Get email threads for Unibox
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const mailboxId = searchParams.get('mailboxId') || null
    const status = searchParams.get('status') || null
    const search = searchParams.get('search') || null
    const campaignId = searchParams.get('campaignId') || null
    const contactId = searchParams.get('contactId') || null
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
    const offset = (page - 1) * pageSize

    // Build query
    let query = supabase
      .from('email_threads')
      .select(`
        *,
        mailboxes!inner(id, email, display_name, provider),
        email_messages(
          id,
          direction,
          subject,
          snippet,
          received_at,
          sent_at,
          read
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    // Apply filters
    if (mailboxId) {
      query = query.eq('mailbox_id', mailboxId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    // Full-text search (PostgreSQL)
    if (search) {
      query = query.or(`subject.ilike.%${search}%,snippet.ilike.%${search}%`)
    }

    const { data: threads, error, count } = await query

    if (error) {
      console.error('Error fetching threads:', error)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    // Transform threads to include unread count and last message preview
    const transformedThreads = (threads || []).map((thread: any) => {
      const messages = thread.email_messages || []
      const lastMessage = messages[messages.length - 1]
      const unreadCount = messages.filter((m: any) => !m.read && m.direction === 'inbound').length

      return {
        id: thread.id,
        subject: thread.subject,
        mailbox: {
          id: thread.mailboxes.id,
          email: thread.mailboxes.email,
          display_name: thread.mailboxes.display_name,
          provider: thread.mailboxes.provider
        },
        status: thread.status,
        unread: thread.unread,
        unreadCount,
        lastMessage: lastMessage ? {
          direction: lastMessage.direction,
          snippet: lastMessage.snippet,
          received_at: lastMessage.received_at || lastMessage.sent_at,
          read: lastMessage.read
        } : null,
        lastMessageAt: thread.last_message_at,
        contactId: thread.contact_id,
        listingId: thread.listing_id,
        campaignId: thread.campaign_id,
        messageCount: messages.length,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at
      }
    })

    return NextResponse.json({
      threads: transformedThreads,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })

  } catch (error: any) {
    console.error('Error in GET /api/unibox/threads:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

