'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mail } from 'lucide-react'
import type { UniboxThread, UniboxMailbox, UniboxFilterStatus, UniboxFilterFolder } from '../../unibox/types'
import UniboxSidebar from '../../unibox/components/UniboxSidebar'
import ThreadList from '../../unibox/components/ThreadList'
import ThreadView from '../../unibox/components/ThreadView'
import ReplyComposer from '../../unibox/components/ReplyComposer'

/**
 * UniboxWrapper - Adapted version of UniboxContent for use within EmailMarketing tabs
 * Removes full-screen layout and adapts to tab context
 */
export default function UniboxWrapper() {
  const [threads, setThreads] = useState<UniboxThread[]>([])
  const [selectedThread, setSelectedThread] = useState<UniboxThread | null>(null)
  // Thread detail from API (with messages) – passed to ThreadView and ReplyComposer
const [threadDetails, setThreadDetails] = useState<Parameters<typeof ThreadView>[0]['thread']>(null)
  const [mailboxes, setMailboxes] = useState<UniboxMailbox[]>([])
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<UniboxFilterStatus>('all')
  const [folderFilter, setFolderFilter] = useState<UniboxFilterFolder>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [composerMode, setComposerMode] = useState<'reply' | 'reply-all' | 'forward' | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Fetch mailboxes
  useEffect(() => {
    fetchMailboxes()
  }, [])

  // Fetch threads
  useEffect(() => {
    fetchThreads()
  }, [selectedMailboxId, statusFilter, folderFilter, searchQuery, page])

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
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedMailboxId) params.append('mailboxId', selectedMailboxId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      
      // Add folder filter support
      if (folderFilter === 'archived') {
        params.append('folder', 'archived')
      } else if (folderFilter === 'starred') {
        params.append('folder', 'starred')
      } else if (folderFilter === 'inbox') {
        params.append('folder', 'inbox')
      }
      
      params.append('page', page.toString())
      params.append('pageSize', '50')

      const response = await fetch(`/api/unibox/threads?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setThreads(data.threads || [])
        setHasMore(data.pagination.page < data.pagination.totalPages)
        
        // Auto-select first thread if none selected
        if (!selectedThread && data.threads && data.threads.length > 0) {
          handleThreadSelect(data.threads[0])
        }
      }
    } catch (error) {
      console.error('Error fetching threads:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchThreadDetails = async (threadId: string) => {
    try {
      setLoadingThread(true)
      const response = await fetch(`/api/unibox/threads/${threadId}`)
      if (response.ok) {
        const data = await response.json()
        setThreadDetails(data.thread)
      }
    } catch (error) {
      console.error('Error fetching thread details:', error)
    } finally {
      setLoadingThread(false)
    }
  }

  const handleThreadSelect = useCallback((thread: UniboxThread) => {
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

  // Get unread count
  const unreadCount = threads.filter(t => t.unread).length

  // Get mailbox for unread counts
  const mailboxUnreadCounts = mailboxes.reduce((acc, mb) => {
    acc[mb.id] = threads.filter(t => t.mailbox.id === mb.id && t.unread).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="h-[calc(100vh-250px)] flex flex-col bg-unibox-background-light dark:bg-unibox-background-dark -mx-6">
      {/* Main Content - Three Pane Layout (matches Elite CRM Unibox design) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar */}
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
        />

        {/* Middle - Thread List */}
        <section className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-200/50 dark:border-slate-700/50 bg-white/20 dark:bg-slate-900/20 backdrop-blur-sm hidden md:flex">
          <div className="h-20 flex items-center px-6 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 material-icons-round text-xl pointer-events-none" aria-hidden>search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search threads..."
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-unibox-primary/50 focus:border-unibox-primary transition-all placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ThreadList
              threads={threads}
              selectedThread={selectedThread}
              onThreadSelect={handleThreadSelect}
              loading={loading}
            />
          </div>
        </section>

        {/* Right - Thread View */}
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
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No thread selected</p>
                <p className="text-sm">Select a thread from the list to view conversation</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Reply/Forward Composer */}
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

