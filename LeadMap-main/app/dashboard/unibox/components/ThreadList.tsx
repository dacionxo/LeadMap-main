'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { UniboxThread } from '../types'

interface ThreadListProps {
  threads: UniboxThread[]
  selectedThread: UniboxThread | null
  onThreadSelect: (thread: UniboxThread) => void
  loading: boolean
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  /** One-click delete for drafts; when provided, shows delete icon on draft rows */
  onDeleteDraft?: (thread: UniboxThread) => void
  /** One-click permanent delete from Recycling Bin; when provided, shows delete icon on rows */
  onDeleteFromTrash?: (thread: UniboxThread) => void
  /** Selected thread IDs for bulk selection */
  selectedIds?: Set<string>
  /** Callback when selection changes */
  onSelectionChange?: (ids: Set<string>) => void
}

const AVATAR_COLORS = [
  'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'bg-yellow-100 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
]

function getInitials(subject: string, email: string): string {
  if (subject && subject.length >= 2) {
    const words = subject.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2)
    }
    return subject.slice(0, 2).toUpperCase()
  }
  if (email) {
    const part = email.split('@')[0] || email
    return part.slice(0, 2).toUpperCase()
  }
  return '?'
}

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export default function ThreadList({
  threads,
  selectedThread,
  onThreadSelect,
  loading,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onDeleteDraft,
  onDeleteFromTrash,
  selectedIds = new Set(),
  onSelectionChange,
}: ThreadListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const selectionMode = Boolean(onSelectionChange)
  const allSelected = threads.length > 0 && threads.every((t) => selectedIds.has(t.id))
  const someSelected = selectedIds.size > 0

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading && onLoadMore) onLoadMore()
  }, [hasMore, loadingMore, loading, onLoadMore])

  useEffect(() => {
    const el = selectAllRef.current
    if (el) el.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore || loading) return
    const el = sentinelRef.current
    if (!el) return
    const scrollRoot = el.closest('.overflow-y-auto') ?? null
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { root: scrollRoot, rootMargin: '200px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, onLoadMore, hasMore, loadingMore, loading, threads.length])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="material-icons-round text-3xl text-slate-400 animate-spin" aria-hidden>refresh</span>
        <span className="sr-only">Loading threads</span>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <span className="material-icons-outlined text-5xl opacity-50 block mb-4" aria-hidden>mail_outline</span>
          <p className="text-sm">No threads found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {selectionMode && threads.length > 0 && (
        <div
          className="flex items-center gap-3 px-5 py-3 border-b border-slate-100/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30"
          role="region"
          aria-label="Selection"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={(e) => {
                e.stopPropagation()
                if (allSelected) {
                  onSelectionChange?.(new Set())
                } else {
                  onSelectionChange?.(new Set(threads.map((t) => t.id)))
                }
              }}
              className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-unibox-primary focus:ring-2 focus:ring-unibox-primary/50"
              aria-label={allSelected ? "Deselect all" : "Select all"}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {someSelected ? `${selectedIds.size} selected` : "Select emails"}
            </span>
          </label>
        </div>
      )}
      {threads.map((thread, index) => {
        const isSelected = selectedThread?.id === thread.id
        const snippet = thread.lastMessage?.snippet || 'No preview'
        const initials = getInitials(thread.subject, thread.mailbox.email)
        const avatarColor = getAvatarColor(index)

        const isDraft = thread.id.startsWith('draft-') && onDeleteDraft
        const isTrash = onDeleteFromTrash && !thread.id.startsWith('draft-')

        return (
          <div
            key={thread.id}
            onClick={() => onThreadSelect(thread)}
            className={`group relative w-full text-left px-5 py-5 cursor-pointer transition-all border-b border-slate-100/50 dark:border-slate-700/50 ${
              isSelected
                ? 'bg-white dark:bg-slate-800 shadow-sm border-b border-slate-100 dark:border-slate-700'
                : 'hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            {isSelected && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-unibox-primary" aria-hidden />
            )}
            {!isSelected && (
              <div className="absolute left-0 top-5 bottom-5 w-1 bg-unibox-primary rounded-r-full opacity-0 group-hover:opacity-50 transition-opacity" aria-hidden />
            )}
            <div className="flex items-start gap-3">
              {selectionMode && (
                <label
                  className="shrink-0 flex items-center mt-2.5 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(thread.id)}
                    onChange={() => onSelectionChange?.(toggleSet(selectedIds, thread.id))}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-unibox-primary focus:ring-2 focus:ring-unibox-primary/50"
                    aria-label={selectedIds.has(thread.id) ? "Deselect email" : "Select email"}
                  />
                </label>
              )}
              <div className="relative shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border ${avatarColor}`}
                  aria-hidden
                >
                  {initials}
                </div>
                {thread.unread && (
                  <div className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-unibox-primary" aria-hidden />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate pr-2">
                    {thread.subject || '(No Subject)'}
                  </h4>
                  <div className="flex items-center gap-1 shrink-0">
                    {(isDraft || isTrash) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          if (isDraft && onDeleteDraft) onDeleteDraft(thread)
                          else if (isTrash && onDeleteFromTrash) onDeleteFromTrash(thread)
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label={isDraft ? "Delete draft" : "Delete permanently"}
                      >
                        <span className="material-icons-outlined text-[18px]" aria-hidden>delete_outline</span>
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                      {formatDate(thread.lastMessageAt)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">
                  {thread.mailbox.display_name || thread.mailbox.email}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {snippet}
                </p>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={sentinelRef} className="h-2 flex-shrink-0" aria-hidden />
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <span className="material-icons-round text-2xl text-slate-400 animate-spin" aria-hidden>refresh</span>
          <span className="sr-only">Loading more threads</span>
        </div>
      )}
    </div>
  )
}
