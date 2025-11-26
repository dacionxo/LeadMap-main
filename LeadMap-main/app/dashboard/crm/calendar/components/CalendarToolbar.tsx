'use client'

import { useState } from 'react'
import { Search, HelpCircle, Settings, Grid3x3, Check, Calendar as CalendarIcon } from 'lucide-react'

interface CalendarToolbarProps {
  onSearch?: (query: string) => void
  onSettingsClick?: () => void
}

export default function CalendarToolbar({ onSearch, onSettingsClick }: CalendarToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      {showSearch ? (
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onBlur={() => {
              if (!searchQuery) {
                setShowSearch(false)
              }
            }}
          />
        </form>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      {/* Help */}
      <button
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        title="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Settings */}
      <button
        onClick={onSettingsClick}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Calendar Icon */}
      <button
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        title="Calendar"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>

      {/* Check Icon */}
      <button
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        title="Check"
      >
        <Check className="w-4 h-4" />
      </button>

      {/* Grid Icon */}
      <button
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        title="More Options"
      >
        <Grid3x3 className="w-4 h-4" />
      </button>
    </div>
  )
}

