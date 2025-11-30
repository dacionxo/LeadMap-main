'use client'

import { 
  Inbox, 
  Archive, 
  Star, 
  Mail,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface Mailbox {
  id: string
  email: string
  display_name: string | null
  provider: string
  active: boolean
}

type FilterStatus = 'all' | 'open' | 'needs_reply' | 'waiting' | 'closed' | 'ignored'
type FilterFolder = 'inbox' | 'archived' | 'starred'

interface Props {
  mailboxes: Mailbox[]
  selectedMailboxId: string | null
  onMailboxSelect: (id: string | null) => void
  statusFilter: FilterStatus
  onStatusFilterChange: (status: FilterStatus) => void
  folderFilter: FilterFolder
  onFolderFilterChange: (folder: FilterFolder) => void
  mailboxUnreadCounts: Record<string, number>
  unreadCount: number
}

export default function UniboxSidebar({
  mailboxes,
  selectedMailboxId,
  onMailboxSelect,
  statusFilter,
  onStatusFilterChange,
  folderFilter,
  onFolderFilterChange,
  mailboxUnreadCounts,
  unreadCount
}: Props) {
  const statusOptions: Array<{ value: FilterStatus; label: string; icon: any }> = [
    { value: 'all', label: 'All', icon: Inbox },
    { value: 'open', label: 'Open', icon: Mail },
    { value: 'needs_reply', label: 'Needs Reply', icon: AlertCircle },
    { value: 'waiting', label: 'Waiting', icon: Clock },
    { value: 'closed', label: 'Closed', icon: CheckCircle2 },
    { value: 'ignored', label: 'Ignored', icon: XCircle }
  ]

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Folders */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-1">
          <button
            onClick={() => onFolderFilterChange('inbox')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              folderFilter === 'inbox'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Inbox className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">Inbox</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onFolderFilterChange('starred')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              folderFilter === 'starred'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Star className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">Starred</span>
          </button>
          <button
            onClick={() => onFolderFilterChange('archived')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              folderFilter === 'archived'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Archive className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">Archived</span>
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Status
        </h3>
        <div className="space-y-1">
          {statusOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => onStatusFilterChange(option.value)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  statusFilter === option.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left text-sm">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mailboxes */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Mailboxes
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onMailboxSelect(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              selectedMailboxId === null
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span className="flex-1 text-left text-sm font-medium">All Mailboxes</span>
          </button>
          {mailboxes.map((mailbox) => {
            const unreadCount = mailboxUnreadCounts[mailbox.id] || 0
            return (
              <button
                key={mailbox.id}
                onClick={() => onMailboxSelect(mailbox.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedMailboxId === mailbox.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span className="flex-1 text-left text-sm truncate">
                  {mailbox.display_name || mailbox.email}
                </span>
                {!mailbox.active && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Inactive" />
                )}
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

