'use client'

type FilterFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archived' | 'recycling_bin'
type FilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'

interface UniboxSidebarProps {
  folderFilter: FilterFolder
  onFolderFilterChange: (folder: FilterFolder) => void
  // Optional props for UniboxWrapper compatibility (ignored by this simplified sidebar)
  mailboxes?: Array<{ id: string; email: string; display_name: string | null; provider: string; active: boolean }>
  selectedMailboxId?: string | null
  onMailboxSelect?: (id: string | null) => void
  statusFilter?: FilterStatus
  onStatusFilterChange?: (status: FilterStatus) => void
  mailboxUnreadCounts?: Record<string, number>
  unreadCount?: number
  folderCounts?: Partial<Record<FilterFolder, number>>
  statusCounts?: Record<FilterStatus, number>
  mailboxCounts?: Record<string, number>
}

const FOLDER_ITEMS: Array<{ value: FilterFolder; label: string; icon: string }> = [
  { value: 'inbox', label: 'Inbox', icon: 'inbox' },
  { value: 'starred', label: 'Starred', icon: 'star' },
  { value: 'sent', label: 'Sent', icon: 'send' },
  { value: 'drafts', label: 'Drafts', icon: 'drafts' },
  { value: 'archived', label: 'Archive', icon: 'archive' },
  { value: 'recycling_bin', label: 'Trash', icon: 'delete' },
]

export default function UniboxSidebar({
  folderFilter,
  onFolderFilterChange,
  folderCounts = {},
  ..._rest
}: UniboxSidebarProps) {
  return (
    <aside className="w-64 flex flex-col py-8 px-6 bg-white/30 shrink-0">
      <div className="flex items-center justify-center px-2 mb-10 pb-6 border-b border-[#F3F4F6]">
        <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Unibox</h2>
      </div>
      <nav className="flex flex-col gap-1">
        {FOLDER_ITEMS.map(({ value, label, icon }) => {
          const count = folderCounts[value] ?? -1
          const showCount = count >= 0
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFolderFilterChange(value)}
              className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all duration-200 ${
                folderFilter === value
                  ? 'unibox-sidebar-active'
                  : 'text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px]" aria-hidden>{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              {showCount && (
                <span
                  className={`flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold shrink-0 ${
                    folderFilter === value ? 'bg-[#137fec] text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
