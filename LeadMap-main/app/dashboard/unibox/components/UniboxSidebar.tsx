'use client'

interface Mailbox {
  id: string
  email: string
  display_name: string | null
  provider: string
  active: boolean
}

type FilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'
type FilterFolder = 'inbox' | 'archived' | 'starred'

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
  /** Total thread count from API for current filters (accurate inbox total) */
  totalThreadCount?: number
  onCompose?: () => void
}

const statusOptions: Array<{ value: FilterStatus; label: string; icon: string }> = [
  { value: 'all', label: 'All', icon: 'all_inclusive' },
  { value: 'open', label: 'Open', icon: 'mail_outline' },
  { value: 'needs_reply', label: 'Needs Reply', icon: 'error_outline' },
  { value: 'waiting', label: 'Waiting', icon: 'schedule' },
  { value: 'closed', label: 'Closed', icon: 'check_circle_outline' },
  { value: 'ignored', label: 'Ignored', icon: 'block' },
]

export default function UniboxSidebar({
  mailboxes,
  selectedMailboxId,
  onMailboxSelect,
  statusFilter,
  onStatusFilterChange,
  folderFilter,
  onFolderFilterChange,
  mailboxUnreadCounts,
  unreadCount,
  totalThreadCount = 0,
  onCompose,
}: UniboxSidebarProps) {
  const handleCompose = () => {
    onCompose?.()
  }

  return (
    <aside className="w-20 lg:w-64 flex-shrink-0 flex flex-col border-r border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40">
      <div className="px-4 lg:px-6 pt-8 pb-6">
        <button
          type="button"
          onClick={handleCompose}
          className="w-full h-12 bg-gradient-to-r from-unibox-primary to-unibox-primary-light hover:to-unibox-primary-dark text-white rounded-full shadow-lg shadow-unibox-primary/30 transition-all duration-200 flex items-center justify-center lg:justify-start lg:px-5 group transform hover:scale-[1.02]"
          aria-label="Compose"
        >
          <span className="material-icons-round text-xl lg:mr-3" aria-hidden>edit</span>
          <span className="font-bold tracking-wide hidden lg:inline">Compose</span>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 lg:px-6 space-y-1 custom-scrollbar" aria-label="Unibox folders and status">
        <button
          type="button"
          onClick={() => onFolderFilterChange('inbox')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl group transition-all font-medium ${
            folderFilter === 'inbox'
              ? 'bg-unibox-primary/10 text-unibox-primary'
              : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center">
            <span className="material-icons-round text-[20px] lg:mr-3" aria-hidden>inbox</span>
            <span className="hidden lg:inline">Inbox</span>
          </div>
          <span className="hidden lg:flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-unibox-primary text-white text-[10px] font-bold" title={unreadCount > 0 ? `${unreadCount} unread` : undefined}>
            {totalThreadCount >= 0 ? totalThreadCount : unreadCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onFolderFilterChange('starred')}
          className={`w-full flex items-center px-4 py-3 rounded-2xl transition-colors ${
            folderFilter === 'starred'
              ? 'bg-unibox-primary/10 text-unibox-primary'
              : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-icons-outlined text-[20px] lg:mr-3" aria-hidden>star_border</span>
          <span className="font-medium hidden lg:inline">Starred</span>
        </button>
        <button
          type="button"
          onClick={() => onFolderFilterChange('archived')}
          className={`w-full flex items-center px-4 py-3 rounded-2xl transition-colors ${
            folderFilter === 'archived'
              ? 'bg-unibox-primary/10 text-unibox-primary'
              : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-icons-outlined text-[20px] lg:mr-3" aria-hidden>archive</span>
          <span className="font-medium hidden lg:inline">Archived</span>
        </button>

        <div className="pt-8 pb-3 hidden lg:block">
          <h3 className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Status
          </h3>
        </div>
        <div className="hidden lg:block space-y-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
              className={`w-full flex items-center px-4 py-2.5 rounded-2xl transition-colors ${
                statusFilter === option.value
                  ? 'bg-blue-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className={`material-icons-outlined text-[18px] mr-3 ${statusFilter === option.value ? '' : 'text-slate-400'}`} aria-hidden>
                {option.icon}
              </span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="pt-8 pb-3 hidden lg:block">
          <h3 className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Mailboxes
          </h3>
        </div>
        <div className="hidden lg:block space-y-1 mb-8">
          <button
            type="button"
            onClick={() => onMailboxSelect(null)}
            className={`w-full flex items-center px-4 py-2.5 rounded-2xl transition-colors ${
              selectedMailboxId === null
                ? 'bg-blue-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="material-icons-outlined text-[18px] mr-3 text-unibox-primary" aria-hidden>folder_open</span>
            <span className="text-sm font-medium">All Mailboxes</span>
          </button>
          {mailboxes.map((mailbox) => {
            const count = mailboxUnreadCounts[mailbox.id] || 0
            const label = mailbox.display_name || mailbox.email
            return (
              <button
                key={mailbox.id}
                type="button"
                onClick={() => onMailboxSelect(mailbox.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
              >
                <div className="flex items-center overflow-hidden min-w-0">
                  <span className="material-icons-outlined text-[18px] mr-3 text-slate-400 shrink-0" aria-hidden>email</span>
                  <span className="text-sm font-medium truncate">{label}</span>
                </div>
                {count > 0 && (
                  <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-unibox-primary text-white text-[10px] font-bold shrink-0 ml-2">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
