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
  /** One-click permanent delete from Recycling; when provided, shows delete icon on rows */
  onDeleteFromTrash?: (thread: UniboxThread) => void
  /** Selected thread IDs for bulk selection */
  selectedIds?: Set<string>
  /** Callback when selection changes */
  onSelectionChange?: (ids: Set<string>) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (isToday) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isYesterday) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
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
        <span className="material-symbols-outlined text-3xl text-slate-400 animate-spin" aria-hidden>refresh</span>
        <span className="sr-only">Loading threads</span>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <span className="material-symbols-outlined text-5xl opacity-50 block mb-4" aria-hidden>mail</span>
          <p className="text-sm">No threads found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col space-y-1">
      {threads.map((thread) => {
        const isSelected = selectedThread?.id === thread.id
        const snippet = thread.lastMessage?.snippet || 'No preview'
        const senderName = thread.mailbox.display_name || thread.mailbox.email || 'Unknown'
        const isDraft = thread.id.startsWith('draft-') && onDeleteDraft
        const isTrash = onDeleteFromTrash && !thread.id.startsWith('draft-')

        return (
          <div
            key={thread.id}
            onClick={() => onThreadSelect(thread)}
            className={`group relative flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
              isSelected
                ? 'bg-white shadow-sm border border-slate-100/50'
                : 'hover:bg-white/40'
            }`}
          >
            {isSelected && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#137fec] rounded-full" aria-hidden />
            )}
            <div className="flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
              {selectionMode ? (
                <input
                  type="checkbox"
                  checked={selectedIds.has(thread.id)}
                  onChange={() => onSelectionChange?.(toggleSet(selectedIds, thread.id))}
                  className={`rounded-full size-4 border-slate-300 text-[#137fec] focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer ${isSelected ? '' : 'opacity-0 group-hover:opacity-100'}`}
                  aria-label={selectedIds.has(thread.id) ? "Deselect email" : "Select email"}
                />
              ) : (
                <div className="size-4 shrink-0" aria-hidden />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className={`text-sm truncate ${isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {senderName}
                </span>
                <span className="text-[11px] text-slate-400 shrink-0 ml-2">{formatDate(thread.lastMessageAt)}</span>
              </div>
              <h4 className={`text-sm truncate mb-1 ${isSelected ? 'font-medium text-[#137fec]' : 'font-normal text-slate-900'}`}>
                {thread.subject || '(No Subject)'}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{snippet}</p>
            </div>
          </div>
        )
      })}
      <div ref={sentinelRef} className="h-2 flex-shrink-0" aria-hidden />
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <span className="material-symbols-outlined text-2xl text-slate-400 animate-spin" aria-hidden>refresh</span>
          <span className="sr-only">Loading more threads</span>
        </div>
      )}
    </div>
  )
}
