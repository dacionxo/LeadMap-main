'use client'

import { useState, useMemo } from 'react'
import { X, Search, LayoutGrid, Kanban, Check, Star } from 'lucide-react'

interface View {
  id: string
  name: string
  type: 'board' | 'table'
  isSystem: boolean
  isStarred?: boolean
  isShared?: boolean
  isOwnedByUser?: boolean
}

interface ViewsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedViewId?: string
  onSelectView: (viewId: string) => void
  onCreateNewView: () => void
}

// Default system views
const DEFAULT_VIEWS: View[] = [
  {
    id: 'board-view',
    name: 'Board view of Deals',
    type: 'board',
    isSystem: true,
    isStarred: false,
  },
  {
    id: 'all-deals',
    name: 'All deals',
    type: 'table',
    isSystem: true,
    isStarred: false,
  },
  {
    id: 'all-my-deals',
    name: 'All my deals',
    type: 'table',
    isSystem: false,
    isOwnedByUser: true,
    isStarred: false,
  },
  {
    id: 'my-lost-deals',
    name: 'My lost deals',
    type: 'table',
    isSystem: false,
    isOwnedByUser: true,
    isStarred: false,
  },
  {
    id: 'my-open-deals',
    name: 'My open deals',
    type: 'table',
    isSystem: false,
    isOwnedByUser: true,
    isStarred: false,
  },
  {
    id: 'my-won-deals',
    name: 'My won deals',
    type: 'table',
    isSystem: false,
    isOwnedByUser: true,
    isStarred: false,
  },
]

// Helper function to get view name by ID
export function getViewName(viewId: string): string {
  const view = DEFAULT_VIEWS.find((v) => v.id === viewId)
  return view?.name || 'All deals'
}

export default function ViewsModal({
  isOpen,
  onClose,
  selectedViewId = 'all-deals',
  onSelectView,
  onCreateNewView,
}: ViewsModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'your' | 'starred' | 'shared'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [views] = useState<View[]>(DEFAULT_VIEWS)

  // Filter views based on active tab and search query
  const filteredViews = useMemo(() => {
    let filtered = views

    // Filter by tab
    if (activeTab === 'your') {
      filtered = filtered.filter((v) => v.isOwnedByUser)
    } else if (activeTab === 'starred') {
      filtered = filtered.filter((v) => v.isStarred)
    } else if (activeTab === 'shared') {
      filtered = filtered.filter((v) => v.isShared)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((v) => v.name.toLowerCase().includes(query))
    }

    return filtered
  }, [views, activeTab, searchQuery])

  const handleViewClick = (viewId: string) => {
    onSelectView(viewId)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Views</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search views"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'all'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            All views
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('your')}
            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'your'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Your views
            {activeTab === 'your' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('starred')}
            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'starred'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Starred
            {activeTab === 'starred' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'shared'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Shared
            {activeTab === 'shared' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />
            )}
          </button>
        </div>

        {/* Views List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredViews.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No views found
            </div>
          ) : (
            filteredViews.map((view) => {
              const isSelected = view.id === selectedViewId
              return (
                <button
                  key={view.id}
                  onClick={() => handleViewClick(view.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* View Icon */}
                    {view.type === 'board' ? (
                      <Kanban className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    ) : (
                      <LayoutGrid className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    )}
                    
                    {/* View Name */}
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {view.name}
                    </span>

                    {/* System Tag */}
                    {view.isSystem && (
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0">
                        System
                      </span>
                    )}
                  </div>

                  {/* Selected Checkmark */}
                  {isSelected && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Create New View Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={() => {
              onCreateNewView()
              onClose()
            }}
            className="px-4 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors"
          >
            Create new view
          </button>
        </div>
      </div>
    </div>
  )
}

