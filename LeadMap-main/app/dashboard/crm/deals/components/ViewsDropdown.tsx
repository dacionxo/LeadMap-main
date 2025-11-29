'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, LayoutGrid, Kanban, Check, ChevronDown } from 'lucide-react'
import { useApp } from '@/app/providers'

interface View {
  id: string
  name: string
  type: 'board' | 'table'
  isSystem: boolean
  isStarred?: boolean
  isShared?: boolean
  isOwnedByUser?: boolean
}

interface ViewsDropdownProps {
  selectedViewId?: string
  onSelectView: (viewId: string) => void
  onCreateNewView: () => void
  views?: View[]
  loading?: boolean
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
export function getViewName(viewId: string, customViews?: View[]): string {
  // First check custom views (from Supabase)
  if (customViews) {
    const customView = customViews.find((v) => v.id === viewId)
    if (customView) return customView.name
  }
  // Then check default views
  const defaultView = DEFAULT_VIEWS.find((v) => v.id === viewId)
  return defaultView?.name || 'All deals'
}

export default function ViewsDropdown({
  selectedViewId = 'all-deals',
  onSelectView,
  onCreateNewView,
  views: providedViews,
  loading = false,
}: ViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'your' | 'starred' | 'shared'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Use provided views or default views
  const views = providedViews && providedViews.length > 0 
    ? [...DEFAULT_VIEWS, ...providedViews.filter(v => !DEFAULT_VIEWS.find(dv => dv.id === v.id))]
    : DEFAULT_VIEWS
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
        setActiveTab('all')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleViewClick = (viewId: string) => {
    onSelectView(viewId)
    setIsOpen(false)
    setSearchQuery('')
    setActiveTab('all')
  }

  const selectedView = views.find((v) => v.id === selectedViewId)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 pl-8 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-w-[140px]"
      >
        <LayoutGrid className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        <span className="pl-6 truncate text-left flex-1">
          {getViewName(selectedViewId)}
        </span>
        <ChevronDown className={`absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 w-80 max-h-[500px] flex flex-col">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search views"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab('all')
              }}
              className={`px-2 py-1.5 text-xs font-medium transition-colors relative ${
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
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab('your')
              }}
              className={`px-2 py-1.5 text-xs font-medium transition-colors relative ${
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
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab('starred')
              }}
              className={`px-2 py-1.5 text-xs font-medium transition-colors relative ${
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
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab('shared')
              }}
              className={`px-2 py-1.5 text-xs font-medium transition-colors relative ${
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
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-[300px]">
            {filteredViews.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
                No views found
              </div>
            ) : (
              filteredViews.map((view) => {
                const isSelected = view.id === selectedViewId
                return (
                  <button
                    key={view.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewClick(view.id)
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* View Icon */}
                      {view.type === 'board' ? (
                        <Kanban className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      ) : (
                        <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      )}
                      
                      {/* View Name */}
                      <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {view.name}
                      </span>

                      {/* System Tag */}
                      {view.isSystem && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0">
                          System
                        </span>
                      )}
                    </div>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Create New View Button */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateNewView()
                setIsOpen(false)
              }}
              className="w-full px-3 py-1.5 text-xs font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors"
            >
              Create new view
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

