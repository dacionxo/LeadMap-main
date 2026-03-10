'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AddRecordsModalProps {
  isOpen: boolean
  onClose: () => void
  listId: string
  listName: string
  listType: 'people' | 'properties'
  /** Call when user chooses Import from CSV (parent should open ImportListModal) */
  onImportClick?: () => void
  /** Call after records were added so parent can refresh */
  onAdded?: (count: number) => void
}

export default function AddRecordsModal({
  isOpen,
  onClose,
  listId,
  listName,
  listType,
  onImportClick,
  onAdded,
}: AddRecordsModalProps) {
  const [idsText, setIdsText] = useState('')
  const [adding, setAdding] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isOpen) return null

  const handleImportClick = () => {
    onClose()
    onImportClick?.()
  }

  const handleAddByIds = async () => {
    const lines = idsText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) {
      setMessage({ type: 'error', text: 'Enter at least one listing ID or URL.' })
      return
    }

    setAdding(true)
    setMessage(null)
    const itemType = listType === 'properties' ? 'listing' : 'contact'
    let added = 0
    const errors: string[] = []

    for (const itemId of lines) {
      try {
        const res = await fetch(`/api/lists/${listId}/add`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, itemType }),
        })
        const data = await res.json()
        if (res.ok && (data.success || data.isNew !== false)) {
          added++
        } else if (res.status === 409) {
          // Already in list - skip, don't count as error
        } else {
          errors.push(data.error || `Failed to add ${itemId}`)
        }
      } catch {
        errors.push(`Failed to add ${itemId}`)
      }
    }

    setAdding(false)
    if (added > 0) {
      setIdsText('')
      setMessage({
        type: 'success',
        text: `Added ${added} record${added !== 1 ? 's' : ''} to "${listName}".${errors.length > 0 ? ` ${errors.length} failed.` : ''}`,
      })
      onAdded?.(added)
    } else if (errors.length > 0) {
      setMessage({ type: 'error', text: errors[0] || 'Failed to add records.' })
    }
  }

  const handleClose = () => {
    if (!adding) {
      setIdsText('')
      setMessage(null)
      onClose()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] transition-opacity"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(131,225,255,0.25)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] z-[10001] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add records to {listName}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={adding}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {onImportClick && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Import from file
              </p>
              <button
                type="button"
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-slate-500">upload_file</span>
                Import from CSV
              </button>
            </div>
          )}

          {listType === 'properties' && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Add by listing ID or property URL
              </p>
              <textarea
                value={idsText}
                onChange={(e) => setIdsText(e.target.value)}
                placeholder="One listing ID or property URL per line"
                rows={4}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleAddByIds}
                disabled={adding || !idsText.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold"
              >
                {adding ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Adding...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Add to list
                  </>
                )}
              </button>
            </div>
          )}

          {listType === 'properties' && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Search and add properties from your pipeline
              </p>
              <Link
                href="/dashboard/prospect-enrich"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                onClick={handleClose}
              >
                Open Find Deals
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
            </div>
          )}

          {message && (
            <div
              className={`px-3 py-2 rounded-xl text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
