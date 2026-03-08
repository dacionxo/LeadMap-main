/**
 * GET /api/unibox/counts
 * Returns all Unibox counts in one request: folders, status, mailboxes, drafts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

type FilterFolder = 'inbox' | 'starred' | 'archived' | 'recycling_bin' | 'trash'
type FilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'

async function countThreads(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  userId: string,
  opts: { folder?: FilterFolder; status?: FilterStatus; mailboxId?: string | null }
): Promise<number> {
  let query = supabase
    .from('email_threads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (opts.folder === 'trash' || opts.folder === 'recycling_bin') {
    query = query.not('trashed_at', 'is', null)
  } else {
    query = query.is('trashed_at', null)
    if (opts.folder === 'inbox') {
      query = query.eq('archived', false)
    } else if (opts.folder === 'starred') {
      query = query.eq('archived', false).eq('starred', true)
    } else if (opts.folder === 'archived') {
      query = query.eq('archived', true)
    }
  }

  if (opts.status && opts.status !== 'all') {
    query = query.eq('status', opts.status)
  }

  if (opts.mailboxId) {
    query = query.eq('mailbox_id', opts.mailboxId)
  }

  const { count, error } = await query
  if (error) return 0
  return count ?? 0
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Get mailboxes for this user
    const { data: mailboxes } = await supabase
      .from('mailboxes')
      .select('id')
      .eq('user_id', userId)

    const mailboxIds: string[] = (mailboxes || []).map((m: { id: string }) => m.id)

    const statuses: FilterStatus[] = ['all', 'open', 'needs_reply', 'waiting', 'closed', 'ignored']

    // Build all count queries
    const recyclingBinCountPromise = countThreads(supabase, userId, { folder: 'recycling_bin' })
    const folderPromises = [
      countThreads(supabase, userId, { folder: 'inbox' }),
      countThreads(supabase, userId, { folder: 'starred' }),
      countThreads(supabase, userId, { folder: 'archived' }),
    ]

    const statusInboxPromises = statuses.map((s) =>
      countThreads(supabase, userId, { folder: 'inbox', status: s })
    )
    const statusStarredPromises = statuses.map((s) =>
      countThreads(supabase, userId, { folder: 'starred', status: s })
    )
    const statusArchivedPromises = statuses.map((s) =>
      countThreads(supabase, userId, { folder: 'archived', status: s })
    )

    const mailboxAllPromise = countThreads(supabase, userId, { folder: 'inbox' })
    const mailboxPerIdPromises = mailboxIds.map((id: string) =>
      countThreads(supabase, userId, { folder: 'inbox', mailboxId: id })
    )

    const draftsPromise = supabase
      .from('email_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then((res: { count: number | null; error: unknown }) => (res.error ? 0 : res.count ?? 0))

    const [
      inboxTotal,
      starredTotal,
      archivedTotal,
      statusInbox,
      statusStarred,
      statusArchived,
      mailboxAllCount,
      mailboxCountsArray,
      draftsCount,
      recyclingBinCount,
    ] = await Promise.all([
      ...folderPromises,
      Promise.all(statusInboxPromises),
      Promise.all(statusStarredPromises),
      Promise.all(statusArchivedPromises),
      mailboxAllPromise,
      Promise.all(mailboxPerIdPromises),
      draftsPromise,
      recyclingBinCountPromise,
    ])

    const statusByFolder = {
      inbox: Object.fromEntries(statuses.map((s, i) => [s, statusInbox[i]])),
      starred: Object.fromEntries(statuses.map((s, i) => [s, statusStarred[i]])),
      archived: Object.fromEntries(statuses.map((s, i) => [s, statusArchived[i]])),
    }

    const mailboxCountMap: Record<string, number> = { all: mailboxAllCount }
    mailboxIds.forEach((id: string, i: number) => {
      mailboxCountMap[id] = mailboxCountsArray[i]
    })

    return NextResponse.json({
      folders: {
        inbox: inboxTotal,
        starred: starredTotal,
        drafts: draftsCount,
        archived: archivedTotal,
        recycling_bin: recyclingBinCount,
      },
      statusByFolder,
      mailboxCounts: mailboxCountMap,
    })
  } catch (error: any) {
    console.error('[GET /api/unibox/counts] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch counts' },
      { status: 500 }
    )
  }
}
