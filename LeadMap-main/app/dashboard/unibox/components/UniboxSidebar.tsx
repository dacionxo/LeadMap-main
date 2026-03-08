'use client'

import type { UniboxFilterFolder } from '../types'

interface UniboxSidebarProps {
  folderFilter: UniboxFilterFolder
  onFolderFilterChange: (folder: UniboxFilterFolder) => void
}

const FOLDER_ITEMS: Array<{ value: UniboxFilterFolder; label: string; icon: string }> = [
  { value: 'inbox', label: 'Inbox', icon: 'inbox' },
  { value: 'starred', label: 'Starred', icon: 'star' },
  { value: 'sent', label: 'Sent', icon: 'send' },
  { value: 'drafts', label: 'Drafts', icon: 'drafts' },
  { value: 'archived', label: 'Archive', icon: 'archive' },
  { value: 'recycling_bin', label: 'Trash', icon: 'delete' },
]

export default function UniboxSidebar({ folderFilter, onFolderFilterChange }: UniboxSidebarProps) {
  return (
    <aside className="w-64 flex flex-col py-8 px-6 bg-white/30 shrink-0">
      <div className="flex items-center gap-3 px-2 mb-10">
        <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Unibox</h2>
      </div>
      <nav className="flex flex-col gap-1">
        {FOLDER_ITEMS.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onFolderFilterChange(value)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
              folderFilter === value
                ? 'unibox-sidebar-active'
                : 'text-slate-500 hover:bg-slate-100/50'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
