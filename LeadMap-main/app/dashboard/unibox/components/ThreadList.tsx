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
  onDeleteDraft?: (thread: UniboxThread) => void
  onDeleteFromTrash?: (thread: UniboxThread) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  /** Current search query */
  searchQuery?: string
  /** Callback to update search query */
  onSearchChange?: (q: string) => void
  /** Label shown as the pane title (e.g. "Inbox", "Starred") */
  folderLabel?: string
  /** Open compose modal */
  onCompose?: () => void
}

const PRIMARY = '#137fec'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  if (diffDays === 1) return 'Yesterday'
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
  searchQuery = '',
  onSearchChange,
  folderLabel = 'Inbox',
  onCompose,
}: ThreadListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <header className="p-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{folderLabel}</h1>
          <button
            type="button"
            onClick={onCompose}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-600 hover:text-[#137fec] transition-colors"
            aria-label="Compose"
          >
            <span className="material-symbols-outlined text-[20px]">edit_note</span>
          </button>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search emails"
            className="w-full bg-slate-100/50 border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#137fec]/20 placeholder:text-slate-400"
            aria-label="Search emails"
          />
        </div>
      </header>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="material-symbols-outlined text-3xl text-slate-400 animate-spin">
              refresh
            </span>
            <span className="sr-only">Loading threads</span>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <span className="material-symbols-outlined text-5xl opacity-40 mb-4">mail</span>
            <p className="text-sm">No emails found</p>
          </div>
        ) : (
          <>
            {threads.map((thread) => {
              const isSelected = selectedThread?.id === thread.id
              const isChecked = selectedIds.has(thread.id)
              const snippet = thread.lastMessage?.snippet || ''
              const senderName =
                thread.mailbox.display_name || thread.mailbox.email || 'Unknown'
              const dateStr = formatDate(thread.lastMessageAt)
              const isDraft = thread.id.startsWith('draft-') && !!onDeleteDraft
              const isTrash = !!onDeleteFromTrash && !thread.id.startsWith('draft-')

              return (
                <div
                  key={thread.id}
                  onClick={() => onThreadSelect(thread)}
                  className={[
                    'group flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors relative',
                    isSelected
                      ? 'bg-white shadow-sm border border-slate-100/50'
                      : 'hover:bg-white/40',
                  ].join(' ')}
                >
                  {/* Left active indicator */}
                  {isSelected && (
                    <div
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full"
                      style={{ background: PRIMARY }}
                      aria-hidden
                    />
                  )}

                  {/* Checkbox */}
                  <div className="flex items-center pt-1 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation()
                        onSelectionChange?.(toggleSet(selectedIds, thread.id))
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={
                        isChecked
                          ? { accentColor: PRIMARY }
                          : {}
                      }
                      className={[
                        'rounded-full w-4 h-4 border-slate-300 cursor-pointer transition-opacity',
                        isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      ].join(' ')}
                      aria-label={isChecked ? 'Deselect email' : 'Select email'}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span
                        className={[
                          'text-sm truncate',
                          isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700',
                        ].join(' ')}
                      >
                        {senderName}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {(isDraft || isTrash) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              if (isDraft && onDeleteDraft) onDeleteDraft(thread)
                              else if (isTrash && onDeleteFromTrash) onDeleteFromTrash(thread)
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                            aria-label={isDraft ? 'Delete draft' : 'Delete permanently'}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {dateStr}
                        </span>
                      </div>
                    </div>
                    <h4
                      className={[
                        'text-sm truncate mb-1',
                        isSelected
                          ? 'font-medium'
                          : 'font-normal text-slate-900',
                      ].join(' ')}
                      style={isSelected ? { color: PRIMARY } : {}}
                    >
                      {thread.subject || '(No Subject)'}
                    </h4>
                    {snippet && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {snippet}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={sentinelRef} className="h-2 flex-shrink-0" aria-hidden />
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <span className="material-symbols-outlined text-2xl text-slate-400 animate-spin">
                  refresh
                </span>
                <span className="sr-only">Loading more</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
