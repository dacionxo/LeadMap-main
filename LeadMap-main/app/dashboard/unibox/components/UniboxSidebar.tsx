'use client'

type FilterFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'scheduled' | 'archived' | 'recycling_bin'
type FilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'

interface UniboxSidebarProps {
  folderFilter: FilterFolder
  onFolderFilterChange: (folder: FilterFolder) => void
  /** Called when user clicks Compose - opens compose modal when provided */
  onCompose?: () => void
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
  { value: 'drafts', label: 'Drafts', icon: 'drafts' },
  { value: 'archived', label: 'Archive', icon: 'archive' },
  { value: 'sent', label: 'Sent', icon: 'send' },
  { value: 'scheduled', label: 'Scheduled', icon: 'schedule' },
  { value: 'recycling_bin', label: 'Trash', icon: 'delete' },
]

export default function UniboxSidebar({
  folderFilter,
  onFolderFilterChange,
  onCompose,
  folderCounts = {},
  ..._rest
}: UniboxSidebarProps) {
  return (
    <aside className="w-64 flex flex-col py-8 px-6 bg-white/30 shrink-0">
      <div className="flex items-center justify-center px-2 mb-10 pb-6 border-b border-[#F3F4F6]">
        <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Unibox</h2>
      </div>
      <nav className="flex flex-col gap-1">
        {onCompose && (
          <button
            type="button"
            onClick={onCompose}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-all duration-200 border-b border-[#F3F4F6] text-[#0693ff] hover:bg-[#0693ff]/10 font-medium"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>edit_note</span>
            <span className="text-sm">Compose</span>
          </button>
        )}
        {FOLDER_ITEMS.map(({ value, label, icon }) => {
          const count = folderCounts[value] ?? -1
          const showCount = count >= 0
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFolderFilterChange(value)}
              className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-all duration-200 border-b border-[#F3F4F6] ${
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
                    folderFilter === value
                      ? value === 'recycling_bin'
                        ? 'bg-red-500 text-white'
                        : value === 'sent'
                          ? 'bg-green-500 text-white'
                          : value === 'scheduled'
                            ? 'bg-amber-500 text-white'
                            : 'bg-[#0693ff] text-white'
                      : value === 'recycling_bin'
                        ? 'bg-red-100 text-red-700'
                        : value === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200/80 text-slate-600'
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
