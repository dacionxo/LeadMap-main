import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { logThreadList } from '@/lib/email/unibox/activity-logger'
import { parseUniboxSearchQuery } from '@/lib/email/unibox/parse-search'

export const runtime = 'nodejs'

/**
 * GET /api/unibox/threads
 * Get email threads for Unibox
 */
export async function GET(request: NextRequest) {
  let user: any = null // Declare outside try block for catch block access
  
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    
    // Get authenticated user
    const { data: { user: authenticatedUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    user = authenticatedUser

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const mailboxId = searchParams.get('mailboxId') || null
    const status = searchParams.get('status') || null
    const search = searchParams.get('search') || null
    const campaignId = searchParams.get('campaignId') || null
    const contactId = searchParams.get('contactId') || null
    const starred = searchParams.get('starred') // 'true' or 'false' or null
    const archived = searchParams.get('archived') // 'true' or 'false' or null
    const folder = searchParams.get('folder') // 'inbox', 'archived', 'starred' (for convenience)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
    const offset = (page - 1) * pageSize

    // Log request for debugging (multi-user safe)
    console.log(`[GET /api/unibox/threads] Request from user ${user.id}:`, {
      mailboxId,
      status,
      starred,
      archived,
      folder,
      search,
      page,
      pageSize,
      timestamp: new Date().toISOString()
    })

    const isSentFolder = folder === 'sent'

    const selectForList = `
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
    `

    // Fast path for search: use RPC + FTS-backed paging of thread ids.
    // Falls back to the legacy ILIKE search if RPC doesn't exist (e.g. migration not applied yet).
    if (search && search.trim()) {
      const parsed = parseUniboxSearchQuery(search)
      const after = parsed.after ? new Date(`${parsed.after}T00:00:00.000Z`).toISOString() : null
      const before = parsed.before ? new Date(`${parsed.before}T23:59:59.999Z`).toISOString() : null

      try {
        const { data: idRows, error: rpcError } = await supabase.rpc('unibox_search_thread_ids', {
          p_user_id: user.id,
          p_mailbox_id: mailboxId,
          p_folder: folder,
          p_status: status && status !== 'all' ? status : null,
          p_starred: starred !== null ? starred === 'true' : null,
          p_archived: archived !== null ? archived === 'true' : null,
          p_campaign_id: campaignId,
          p_contact_id: contactId,
          p_text: parsed.text || null,
          p_subject: parsed.subject || null,
          p_from: parsed.from || null,
          p_to: parsed.to || null,
          p_has_attachment: typeof parsed.hasAttachment === 'boolean' ? parsed.hasAttachment : null,
          p_is_read: typeof parsed.isRead === 'boolean' ? parsed.isRead : null,
          p_is_unread: typeof parsed.isUnread === 'boolean' ? parsed.isUnread : null,
          p_after: after,
          p_before: before,
          p_limit: pageSize,
          p_offset: offset,
        })

        if (rpcError) throw rpcError

        const ids = (idRows || []).map((r: any) => r.thread_id).filter(Boolean)
        const total = Number((idRows?.[0] as any)?.total_count ?? 0)

        if (ids.length === 0) {
          return NextResponse.json({
            threads: [],
            pagination: { page, pageSize, total: 0, totalPages: 0 },
          })
        }

        const { data: threads, error: threadsError } = await supabase
          .from('email_threads')
          .select(selectForList)
          .eq('user_id', user.id)
          .in('id', ids)
          .order('last_message_at', { ascending: false })

        if (threadsError) {
          return NextResponse.json(
            {
              error: 'Failed to fetch threads',
              details: process.env.NODE_ENV === 'development' ? threadsError.message : undefined,
            },
            { status: 500 }
          )
        }

        const transformedThreads = (threads || [])
          .map((thread: any) => {
            const messages = thread.email_messages || []
            const inboundMessages = messages.filter((m: any) => m.direction === 'inbound')
            const outboundMessages = messages.filter((m: any) => m.direction === 'outbound')

            if (isSentFolder) {
              if (outboundMessages.length === 0) return null
            } else {
              if (inboundMessages.length === 0) return null
            }

            const lastMessage = messages[messages.length - 1]
            const unreadCount = inboundMessages.filter((m: any) => !m.read).length

            return {
              id: thread.id,
              subject: thread.subject,
              mailbox: {
                id: thread.mailboxes.id,
                email: thread.mailboxes.email,
                display_name: thread.mailboxes.display_name,
                provider: thread.mailboxes.provider,
              },
              status: thread.status,
              unread: thread.unread,
              unreadCount,
              starred: thread.starred || false,
              archived: thread.archived || false,
              lastMessage: lastMessage
                ? {
                    direction: lastMessage.direction,
                    snippet: lastMessage.snippet,
                    received_at: lastMessage.received_at || lastMessage.sent_at,
                    read: lastMessage.read,
                  }
                : null,
              lastMessageAt: thread.last_message_at,
              contactId: thread.contact_id,
              listingId: thread.listing_id,
              campaignId: thread.campaign_id,
              messageCount: messages.length,
              createdAt: thread.created_at,
              updatedAt: thread.updated_at,
            }
          })
          .filter((t: any) => t !== null)

        return NextResponse.json({
          threads: transformedThreads,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        })
      } catch (rpcOrSearchError: any) {
        console.warn('[GET /api/unibox/threads] Search RPC unavailable, falling back to ILIKE.', {
          message: rpcOrSearchError?.message,
          code: rpcOrSearchError?.code,
        })
        // continue to legacy query below
      }
    }

    // Legacy path (no search or RPC unavailable): basic filtering via PostgREST
    let query = supabase
      .from('email_threads')
      .select(selectForList, { count: 'exact' })
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    // Apply filters
    // CRITICAL: Always filter by user_id first for multi-user isolation
    // This ensures users can only access their own threads
    
    if (mailboxId) {
      query = query.eq('mailbox_id', mailboxId)
    }

    if (status && status !== 'all') {
      // Validate status is one of the allowed values
      const validStatuses = ['open', 'needs_reply', 'waiting', 'closed', 'ignored']
      if (validStatuses.includes(status)) {
        query = query.eq('status', status)
      }
    }

    // Helper to apply folder filters (trashed_at may not exist if migration not run)
    const applyFolderFilters = (q: typeof query, useTrashedAt: boolean) => {
      const isRecyclingBin = folder === 'trash' || folder === 'recycling_bin'
      const isSent = folder === 'sent'
      if (useTrashedAt) {
        if (isRecyclingBin) {
          return q.not('trashed_at', 'is', null)
        }
        q = q.is('trashed_at', null)
      } else if (isRecyclingBin) {
        // trashed_at column missing: return no rows for trash
        return q.eq('id', '00000000-0000-0000-0000-000000000000')
      }
      if (isSent) {
        // Sent: only threads where user has sent at least one message (never show received-only)
        return q.not('last_outbound_at', 'is', null)
      }
      if (folder === 'archived') return q.eq('archived', true)
      if (folder === 'starred') return q.eq('starred', true)
      if (folder === 'inbox') return q.eq('archived', false)
      return q
    }

    // Handle folder filter
    query = applyFolderFilters(query, true)

    // Handle explicit starred/archived filters (takes precedence over folder, except for trash)
    if (starred !== null) {
      query = query.eq('starred', starred === 'true')
    }
    if (archived !== null) {
      query = query.eq('archived', archived === 'true')
    }

    // By default, if no folder/archived specified, exclude archived threads (show inbox)
    // Sent folder shows all sent (archived or not); inbox/starred exclude archived
    const isRecyclingBin = folder === 'trash' || folder === 'recycling_bin'
    if (!isRecyclingBin && folder !== 'archived' && folder !== 'sent' && archived === null && starred === null) {
      query = query.eq('archived', false)
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    // Basic search (legacy): escape ILIKE special chars %, _, \
    if (search && search.trim()) {
      const escaped = search.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
      // NOTE: Keep this intentionally simple as a fallback when RPC is unavailable.
      query = query.ilike('subject', `%${escaped}%`)
    }

    let result = await query
    let threads = result.data
    let error = result.error
    let count = result.count

    // Fallback: if error suggests trashed_at column missing, retry without it
    // (migration add_email_threads_trashed_at may not have run)
    let errMsg = String(error?.message ?? error ?? '')
    try {
      const parsed = JSON.parse(errMsg)
      errMsg = String(parsed?.message ?? parsed?.details ?? errMsg)
    } catch { /* use errMsg as is */ }
    errMsg = errMsg.toLowerCase()
    const missingColumn = errMsg.includes('trashed_at') || errMsg.includes('42703') || /column.*does not exist/.test(errMsg)
    if (error && missingColumn) {
      query = supabase
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
      if (mailboxId) query = query.eq('mailbox_id', mailboxId)
      if (status && status !== 'all') {
        const validStatuses = ['open', 'needs_reply', 'waiting', 'closed', 'ignored']
        if (validStatuses.includes(status)) query = query.eq('status', status)
      }
      query = applyFolderFilters(query, false)
      if (starred !== null) query = query.eq('starred', starred === 'true')
      if (archived !== null) query = query.eq('archived', archived === 'true')
      const retryIsRecyclingBin = folder === 'trash' || folder === 'recycling_bin'
      if (!retryIsRecyclingBin && folder !== 'archived' && folder !== 'sent' && archived === null && starred === null) {
        query = query.eq('archived', false)
      }
      if (campaignId) query = query.eq('campaign_id', campaignId)
      if (contactId) query = query.eq('contact_id', contactId)
      if (search && search.trim()) {
        const escapedRetry = search.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
        query = query.or(`subject.ilike.%${escapedRetry}%,snippet.ilike.%${escapedRetry}%`)
      }
      result = await query
      threads = result.data
      error = result.error
      count = result.count
      if (!error) {
        console.log(`[GET /api/unibox/threads] Retried without trashed_at for user ${user.id} (migration may not have run)`)
      }
    }

    // Log query result for debugging (multi-user safe)
    console.log(`[GET /api/unibox/threads] Query result for user ${user.id}:`, {
      threadCount: threads?.length || 0,
      totalCount: count,
      filters: { mailboxId, status, starred, archived, folder },
      error: error?.message,
      timestamp: new Date().toISOString()
    })

    if (error) {
      console.error(`[GET /api/unibox/threads] Database error for user ${user.id}:`, error)
      
      // Log error to Supabase (non-blocking)
      logThreadList({
        userId: user.id,
        request,
        filters: {
          mailboxId,
          status,
          starred,
          archived,
          folder,
          search,
          page,
          pageSize
        },
        result: {
          threadCount: 0,
          totalCount: 0,
          success: false,
          error: error.message
        }
      }).catch(err => {
        console.error('[UniboxLogger] Failed to log error:', err)
      })
      
      return NextResponse.json({ 
        error: 'Failed to fetch threads',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 })
    }

    // Transform threads to include unread count and last message preview
    // Inbox/archived/starred: only include threads with at least one inbound (received)
    // Sent: only include threads with at least one outbound (sent by user)
    const transformedThreads = (threads || [])
      .map((thread: any) => {
      const messages = thread.email_messages || []
        const inboundMessages = messages.filter((m: any) => m.direction === 'inbound')
        const outboundMessages = messages.filter((m: any) => m.direction === 'outbound')

        if (isSentFolder) {
          if (outboundMessages.length === 0) return null
        } else {
          if (inboundMessages.length === 0) return null
        }

      const lastMessage = messages[messages.length - 1]
      const unreadCount = inboundMessages.filter((m: any) => !m.read).length
      return {
        id: thread.id,
        subject: thread.subject,
        mailbox: {
          id: thread.mailboxes.id,
          email: thread.mailboxes.email,
          display_name: thread.mailboxes.display_name,
          provider: thread.mailboxes.provider
        },
        status: thread.status, // 'open', 'needs_reply', 'waiting', 'closed', 'ignored'
        unread: thread.unread,
        unreadCount,
        starred: thread.starred || false,
        archived: thread.archived || false,
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
      .filter((thread: any) => thread !== null)  // Remove threads with no inbound messages

    // Log successful response (multi-user safe)
    console.log(`[GET /api/unibox/threads] Success for user ${user.id}:`, {
      returnedThreads: transformedThreads.length,
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / pageSize),
      timestamp: new Date().toISOString()
    })

    // Log to Supabase (non-blocking)
    logThreadList({
      userId: user.id,
      request,
      filters: {
        mailboxId,
        status,
        starred,
        archived,
        folder,
        search,
        page,
        pageSize
      },
      result: {
        threadCount: transformedThreads.length,
        totalCount: count || 0,
        success: true
      }
    }).catch(err => {
      // Don't fail the request if logging fails
      console.error('[UniboxLogger] Failed to log thread list:', err)
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
    const userId = user?.id || 'unknown'
    
    console.error(`[GET /api/unibox/threads] Unhandled exception for user ${userId}:`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    })
    
    // Log exception to Supabase (non-blocking) - only if user was authenticated
    if (user?.id) {
      logThreadList({
        userId: user.id,
        request,
        filters: {
          mailboxId: null,
          status: null,
          starred: null,
          archived: null,
          folder: null,
          search: null,
          page: 1,
          pageSize: 50
        },
        result: {
          threadCount: 0,
          totalCount: 0,
          success: false,
          error: error.message
        }
      }).catch(err => {
        console.error('[UniboxLogger] Failed to log exception:', err)
      })
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

