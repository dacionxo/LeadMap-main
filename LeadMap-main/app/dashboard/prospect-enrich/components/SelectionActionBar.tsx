'use client'

/**
 * SelectionActionBar — Modern Floating Bulk Action Bar V2
 *
 * A 1-to-1 recreation of the floating glass-panel action bar shown when
 * prospects are selected. Features glassmorphism design, rounded-pill shape,
 * blue gradient badge, and horizontal scrollable action buttons.
 *
 * Actions: Mass email, Add to sequence, Add to List, Add to CRM, Duplicate,
 * Export, Archive, Delete, Convert, Move to, Sidekick, Apps.
 */

import React from 'react'
import { cn } from '@/app/lib/utils'

export interface SelectionActionBarProps {
  selectedCount: number
  onClose: () => void
  onMassEmail?: () => void
  onAddToSequence?: () => void
  onAddToList?: () => void
  onAddToCrm?: () => void
  onDuplicate?: () => void
  onExport?: () => void
  onArchive?: () => void
  onDelete?: () => void
  onConvert?: () => void
  onMoveTo?: () => void
  onSidekick?: () => void
  onApps?: () => void
  isDark?: boolean
}

interface ActionButtonProps {
  icon: string
  label: string
  onClick?: () => void
  isDark?: boolean
  isDelete?: boolean
}

const ActionButton = ({ icon, label, onClick, isDark, isDelete, minWidth }: ActionButtonProps & { minWidth?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group flex flex-col items-center justify-center px-4 py-2 rounded-lg',
      'transition-all duration-200',
      minWidth || 'min-w-[72px]',
      isDelete
        ? 'hover:bg-red-50/80 dark:hover:bg-red-900/30'
        : 'hover:bg-white/80 dark:hover:bg-gray-700/50'
    )}
    aria-label={label}
  >
    <span
      className={cn(
        'material-symbols-outlined text-[22px] mb-1.5 leading-none transition-colors',
        'text-slate-500 dark:text-slate-400',
        isDelete
          ? 'group-hover:text-red-500 dark:group-hover:text-red-400'
          : 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
      )}
      aria-hidden
    >
      {icon}
    </span>
    <span
      className={cn(
        'text-[11px] font-medium whitespace-nowrap tracking-wide transition-colors',
        isDelete
          ? 'text-slate-500 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400'
          : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
      )}
    >
      {label}
    </span>
  </button>
)

export default function SelectionActionBar({
  selectedCount,
  onClose,
  onMassEmail,
  onAddToSequence,
  onAddToList,
  onAddToCrm,
  onDuplicate,
  onExport,
  onArchive,
  onDelete,
  onConvert,
  onMoveTo,
  onSidekick,
  onApps,
  isDark = false,
}: SelectionActionBarProps) {
  if (selectedCount <= 0) return null

  const label = selectedCount === 1 ? 'Prospect selected' : 'Prospects selected'

  return (
    <div
      role="toolbar"
      aria-label={`${selectedCount} ${label}. Actions for selected prospects.`}
      className={cn(
        'relative z-10 w-full max-w-[85rem] px-4 animate-fade-in-up flex justify-center',
        'font-display transition-colors duration-200'
      )}
    >
      <div
        className={cn(
          'glass-panel rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]',
          'p-2.5 flex items-center justify-between gap-1 transition-all duration-200',
          'bg-white/85 dark:bg-slate-800/85',
          'backdrop-blur-[8px]',
          'border border-white/60 dark:border-white/10'
        )}
      >
        {/* Selection indicator: blue gradient badge + count + label */}
        <div className="flex items-center gap-3 pl-5 pr-6 border-r border-gray-200/60 dark:border-gray-700/60 shrink-0 py-1">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white/50 dark:ring-gray-800/50">
            {selectedCount}
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap tracking-tight">
            {label}
          </span>
        </div>

        {/* Action buttons: horizontal scrollable */}
        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar px-2">
          <ActionButton
            icon="email"
            label="Mass email"
            onClick={onMassEmail}
            isDark={isDark}
          />
          <ActionButton
            icon="playlist_add"
            label="Add to sequence"
            onClick={onAddToSequence}
            isDark={isDark}
            minWidth="min-w-[84px]"
          />
          <ActionButton
            icon="list"
            label="Add to List"
            onClick={onAddToList}
            isDark={isDark}
          />
          <ActionButton
            icon="bookmark_border"
            label="Add to CRM"
            onClick={onAddToCrm}
            isDark={isDark}
          />
          <ActionButton
            icon="content_copy"
            label="Duplicate"
            onClick={onDuplicate}
            isDark={isDark}
          />
          <ActionButton
            icon="file_download"
            label="Export"
            onClick={onExport}
            isDark={isDark}
          />
          <ActionButton
            icon="inventory_2"
            label="Archive"
            onClick={onArchive}
            isDark={isDark}
          />
          <ActionButton
            icon="delete"
            label="Delete"
            onClick={onDelete}
            isDark={isDark}
            isDelete={true}
          />
          <div className="w-px h-8 bg-gray-200/60 dark:bg-gray-700/60 mx-1" aria-hidden />
          <ActionButton
            icon="cached"
            label="Convert"
            onClick={onConvert}
            isDark={isDark}
          />
          <ActionButton
            icon="arrow_forward"
            label="Move to"
            onClick={onMoveTo}
            isDark={isDark}
          />
          <ActionButton
            icon="auto_awesome"
            label="Sidekick"
            onClick={onSidekick}
            isDark={isDark}
          />
          <ActionButton
            icon="extension"
            label="Apps"
            onClick={onApps}
            isDark={isDark}
          />
        </div>

        {/* Close button */}
        <div className="flex items-center pl-2 pr-4 border-l border-gray-200/60 dark:border-gray-700/60 shrink-0 h-10">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Clear selection"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
