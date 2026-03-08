'use client'

interface Mailbox {
  id: string
  email: string
  display_name: string | null
  provider: string
  active: boolean
}

type FilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'
type FilterFolder = 'inbox' | 'archived' | 'starred' | 'drafts' | 'recycling_bin'

interface UniboxSidebarProps {
  mailboxes: Mailbox[]
  selectedMailboxId: string | null
  onMailboxSelect: (id: string | null) => void
  statusFilter: FilterStatus
  onStatusFilterChange: (status: FilterStatus) => void
  folderFilter: FilterFolder
  onFolderFilterChange: (folder: FilterFolder) => void
  mailboxUnreadCounts: Record<string, number>
  unreadCount: number
  folderCounts?: Partial<Record<FilterFolder, number>>
  statusCounts?: Record<FilterStatus, number>
  mailboxCounts?: Record<string, number>
  onCompose?: () => void
}

const PRIMARY = '#137fec'
const PRIMARY_BG = 'rgba(19, 127, 236, 0.08)'

const navItems: Array<{ value: FilterFolder | 'sent'; label: string; icon: string }> = [
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
  onCompose,
}: UniboxSidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 flex flex-col py-8 px-6 bg-white/30">
      <div className="flex items-center gap-3 px-2 mb-10">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Unibox</h2>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isSent = item.value === 'sent'
          const isActive = !isSent && folderFilter === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                if (!isSent) onFolderFilterChange(item.value as FilterFolder)
              }}
              style={isActive ? { background: PRIMARY_BG, color: PRIMARY } : {}}
              className={[
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 w-full text-left',
                isActive ? '' : 'text-slate-500 hover:bg-slate-100/50',
                isSent ? 'opacity-50 cursor-default' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={isSent ? -1 : undefined}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
