'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import UniboxSidebar from './UniboxSidebar'
import ThreadList from './ThreadList'
import ThreadView from './ThreadView'
import ReplyComposer from './ReplyComposer'

interface Thread {
  id: string
  subject: string
  mailbox: {
    id: string
    email: string
    display_name: string | null
    provider: string
  }
  status: string
  unread: boolean
  unreadCount: number
  starred: boolean
  archived: boolean
  lastMessage: {
    direction: 'inbound' | 'outbound'
    snippet: string
    received_at: string | null
    read: boolean
  } | null
  lastMessageAt: string
  contactId?: string | null
  listingId?: string | null
  campaignId?: string | null
  messageCount: number
  createdAt?: string
  updatedAt?: string
}

interface Mailbox {
  id: string
  email: string
  display_name: string | null
  provider: string
  active: boolean
}

type FilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'
type FilterFolder = 'inbox' | 'archived' | 'starred'

interface UniboxContentProps {
  /** When true, render only the three-pane layout (no Elite header/mesh). For use inside dashboard layout. */
  embedded?: boolean
}

export default function UniboxContent({ embedded = false }: UniboxContentProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [threadDetails, setThreadDetails] = useState<any>(null)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [folderFilter, setFolderFilter] = useState<FilterFolder>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [composerMode, setComposerMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalThreadCount, setTotalThreadCount] = useState<number>(0)

  useEffect(() => {
    fetchMailboxes()
  }, [])

  // Reset to page 1 when filters or search change so next fetch replaces the list
  useEffect(() => {
    setPage(1)
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery])

  useEffect(() => {
    fetchThreads()
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery, page])

  useEffect(() => {
    const handleRefresh = () => {
      fetchThreads()
      if (selectedThread) fetchThreadDetails(selectedThread.id)
    }
    window.addEventListener('unibox-refresh', handleRefresh)
    return () => window.removeEventListener('unibox-refresh', handleRefresh)
  }, [selectedThread])

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes')
      if (response.ok) {
        const data = await response.json()
        setMailboxes(data.mailboxes || [])
      }
    } catch (error) {
      console.error('Error fetching mailboxes:', error)
    }
  }

  const fetchThreads = async () => {
    const isFirstPage = page === 1
    try {
      if (isFirstPage) setLoading(true)
      else setLoadingMore(true)
      const params = new URLSearchParams()
      if (selectedMailboxId) params.append('mailboxId', selectedMailboxId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      if (folderFilter === 'archived') params.append('folder', 'archived')
      else if (folderFilter === 'starred') params.append('folder', 'starred')
      else if (folderFilter === 'inbox') params.append('folder', 'inbox')
      params.append('page', page.toString())
      params.append('pageSize', '50')

      const response = await fetch(`/api/unibox/threads?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        const newThreads = data.threads || []
        const total = data.pagination?.total ?? 0
        const totalPages = data.pagination?.totalPages ?? 1
        setTotalThreadCount(total)
        setHasMore(page < totalPages)
        if (isFirstPage) {
          setThreads(newThreads)
          if (!selectedThread && newThreads.length > 0) {
            handleThreadSelect(newThreads[0])
          }
        } else {
          setThreads((prev) => {
            const seen = new Set(prev.map((t) => t.id))
            const appended = newThreads.filter((t: Thread) => !seen.has(t.id))
            return appended.length ? [...prev, ...appended] : prev
          })
        }
      }
    } catch (error) {
      console.error('Error fetching threads:', error)
    } finally {
      if (isFirstPage) setLoading(false)
      else setLoadingMore(false)
    }
  }

  const fetchThreadDetails = async (threadId: string) => {
    try {
      setLoadingThread(true)
      const response = await fetch(`/api/unibox/threads/${threadId}`)
      if (response.ok) {
        const data = await response.json()
        setThreadDetails(data.thread)
      } else {
        setThreadDetails(null)
      }
    } catch (error) {
      console.error('[UniboxContent] Error fetching thread details:', error)
      setThreadDetails(null)
    } finally {
      setLoadingThread(false)
    }
  }

  const handleThreadSelect = useCallback((thread: Thread) => {
    setSelectedThread(thread)
    fetchThreadDetails(thread.id)
  }, [])

  const handleReply = () => {
    setComposerMode('reply')
    setShowComposer(true)
  }

  const handleReplyAll = () => {
    setComposerMode('reply-all')
    setShowComposer(true)
  }

  const handleForward = () => {
    setComposerMode('forward')
    setShowComposer(true)
  }

  const handleComposerClose = () => {
    setShowComposer(false)
    setComposerMode(null)
  }

  const handleComposerSend = async (data: any) => {
    if (!selectedThread) return
    try {
      let endpoint = ''
      let body: any = {}
      if (composerMode === 'reply' || composerMode === 'reply-all') {
        endpoint = `/api/unibox/threads/${selectedThread.id}/reply`
        body = {
          mailboxId: selectedThread.mailbox.id,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
          replyAll: composerMode === 'reply-all',
          cc: data.cc || [],
          bcc: data.bcc || []
        }
      } else if (composerMode === 'forward') {
        endpoint = `/api/unibox/threads/${selectedThread.id}/forward`
        body = {
          mailboxId: selectedThread.mailbox.id,
          to: data.to,
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText
        }
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (response.ok) {
        handleComposerClose()
        if (selectedThread) {
          fetchThreadDetails(selectedThread.id)
          fetchThreads()
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error || 'Failed to send'}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to send'}`)
    }
  }

  const unreadCount = threads.filter((t) => t.unread).length
  const mailboxUnreadCounts = mailboxes.reduce((acc, mb) => {
    acc[mb.id] = threads.filter((t) => t.mailbox.id === mb.id && t.unread).length
    return acc
  }, {} as Record<string, number>)

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) setPage((p) => p + 1)
  }, [hasMore, loadingMore, loading])

  const threePane = (
    <>
      <UniboxSidebar
        mailboxes={mailboxes}
        selectedMailboxId={selectedMailboxId}
        onMailboxSelect={setSelectedMailboxId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        folderFilter={folderFilter}
        onFolderFilterChange={setFolderFilter}
        mailboxUnreadCounts={mailboxUnreadCounts}
        unreadCount={unreadCount}
        totalThreadCount={totalThreadCount}
        onCompose={() => setShowComposer(true)}
      />

      {/* Thread list column */}
      <section className="w-[400px] flex-shrink-0 flex-col border-r border-slate-200/50 dark:border-slate-700/50 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm hidden md:flex md:flex-col">
        <div className="h-20 flex items-center px-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="relative w-full">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 material-icons-round text-xl pointer-events-none" aria-hidden>search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-unibox-primary/50 focus:border-unibox-primary transition-all placeholder-slate-400 shadow-sm"
              aria-label="Search threads"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <ThreadList
            threads={threads}
            selectedThread={selectedThread}
            onThreadSelect={handleThreadSelect}
            loading={loading}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
          />
        </div>
      </section>

      {/* Thread view column */}
      <section className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden min-w-0">
        {selectedThread ? (
          <ThreadView
            thread={threadDetails}
            loading={loadingThread}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <span className="material-icons-outlined text-6xl opacity-50 block mb-4" aria-hidden>mail_outline</span>
              <p className="text-lg font-medium mb-2">No thread selected</p>
              <p className="text-sm">Select a thread from the list to view conversation</p>
            </div>
          </div>
        )}
      </section>
    </>
  )

  if (embedded) {
    return (
      <>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {threePane}
        </div>
        {showComposer && selectedThread && threadDetails && (
          <ReplyComposer
            thread={threadDetails}
            mode={composerMode}
            onClose={handleComposerClose}
            onSend={handleComposerSend}
            mailbox={selectedThread.mailbox}
          />
        )}
      </>
    )
  }

  return (
    <div className="unibox-page unibox-mesh min-h-screen text-slate-800 dark:text-slate-200 font-display p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden">
      {/* Elite header */}
      <header className="w-full max-w-[1760px] flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-unibox-primary text-white flex items-center justify-center">
            <span className="material-icons-round text-lg" aria-hidden>check_circle</span>
          </div>
          <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">NextDeal</span>
        </div>
        <nav className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-full border border-white/40 dark:border-slate-700/40 backdrop-blur-sm">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Apps"
          >
            <span className="material-icons-round text-base" aria-hidden>grid_view</span>
            Apps
          </Link>
          <Link
            href="/dashboard/crm/calendar"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Calendar"
          >
            <span className="material-icons-round text-base" aria-hidden>calendar_today</span>
            Calendar
          </Link>
          <Link
            href="/dashboard/email/campaigns"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700 rounded-full transition-all flex items-center gap-2"
            aria-label="Campaigns"
          >
            <span className="material-icons-round text-base" aria-hidden>campaign</span>
            Campaigns
          </Link>
          <span
            className="px-4 py-2 text-sm font-bold text-unibox-primary bg-white dark:bg-slate-700 shadow-sm rounded-full transition-all flex items-center gap-2"
            aria-current="page"
          >
            <span className="material-icons-round text-base" aria-hidden>inbox</span>
            Unibox
          </span>
        </nav>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 flex items-center justify-center font-bold text-xs"
            aria-hidden
          >
            T
          </div>
        </div>
      </header>

      {/* Main glass panel */}
      <main className="w-full max-w-[1760px] h-[85vh] unibox-glass-panel rounded-3xl shadow-unibox-glass flex overflow-hidden relative">
        {threePane}
      </main>

      {showComposer && selectedThread && threadDetails && (
        <ReplyComposer
          thread={threadDetails}
          mode={composerMode}
          onClose={handleComposerClose}
          onSend={handleComposerSend}
          mailbox={selectedThread.mailbox}
        />
      )}
    </div>
  )
}
