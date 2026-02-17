'use client'

/**
 * ProspectSearchHeader — Elite Property Prospecting Dashboard design
 * 1:1 match: Find Deals, Import, Research with AI, Search places, Default View,
 * Hide Filters, Search Settings, Total/Net New/Saved tabs.
 */

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { cn } from '@/app/lib/utils'

type DisplayView = 'default' | 'compact' | 'detailed' | 'map'

interface ProspectSearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filtersVisible: boolean
  onToggleFilters: () => void
  onImport: () => void
  /** When false, the Import button is hidden. Show only when filter=imports. */
  showImportButton?: boolean
  onResearchWithAI?: () => void
  onCreateWorkflow?: () => void
  onSaveSearch?: () => void
  onAutoScore?: () => void
  onSearchSettings?: () => void
  isDark?: boolean
  displayView?: DisplayView
  onDisplayViewChange?: (view: DisplayView) => void
  totalCount: number
  netNewCount: number
  savedCount: number
  viewType: 'total' | 'net_new' | 'saved'
  onViewTypeChange?: (view: 'total' | 'net_new' | 'saved') => void
}

const getViewLabel = (view: DisplayView) => {
  switch (view) {
    case 'default': return 'Default View'
    case 'compact': return 'Compact View'
    case 'detailed': return 'Detailed View'
    case 'map': return 'Map View'
    default: return 'Default View'
  }
}

export default function ProspectSearchHeader({
  searchQuery,
  onSearchChange,
  filtersVisible,
  onToggleFilters,
  onImport,
  showImportButton = true,
  onResearchWithAI,
  onSearchSettings,
  isDark = false,
  displayView = 'default',
  onDisplayViewChange,
  totalCount = 0,
  netNewCount = 0,
  savedCount = 0,
  viewType = 'total',
  onViewTypeChange
}: ProspectSearchHeaderProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

  return (
    <header className="p-6 pb-2">
      {/* Top row: Title + Import + Research with AI */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
          Find Deals
        </h1>
        <div className="flex gap-3">
          {showImportButton && (
            <DropdownMenu open={importOpen} onOpenChange={setImportOpen}>
              <DropdownMenuTrigger asChild>
                <button className="bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm transition-all flex items-center gap-2 shadow-sm">
                  Import
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { onImport(); setImportOpen(false); }}>
                  Import from CSV
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Import from Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            onClick={onResearchWithAI}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-5 py-2 rounded-lg shadow-lg shadow-indigo-500/30 text-sm transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Research with AI
          </button>
        </div>
      </div>

      {/* Controls row: Search, Default View, Hide Filters, Search Settings */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search places..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={onToggleFilters}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          {filtersVisible ? 'Hide Filters' : 'Show Filters'}
        </button>
        <DropdownMenu open={viewOpen} onOpenChange={setViewOpen}>
          <DropdownMenuTrigger asChild>
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
              {getViewLabel(displayView)}
              <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => { onDisplayViewChange?.('default'); setViewOpen(false); }}>Default View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onDisplayViewChange?.('map'); setViewOpen(false); }}>Map View</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={onSearchSettings}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          Search Settings
        </button>
      </div>

      {/* Tabs: Total, Net New, Saved */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onViewTypeChange?.('total')}
          className={cn(
            "px-6 py-3 border-b-2 text-sm flex flex-col items-center min-w-[120px] transition-colors",
            viewType === 'total'
              ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold"
              : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium"
          )}
        >
          <span className={cn(
            "text-xs uppercase font-bold tracking-wider mb-0.5",
            viewType === 'total' ? "text-indigo-400 dark:text-indigo-500" : "text-slate-400 dark:text-slate-500"
          )}>Total</span>
          {totalCount.toLocaleString()}
        </button>
        <button
          onClick={() => onViewTypeChange?.('net_new')}
          className={cn(
            "px-6 py-3 border-b-2 text-sm flex flex-col items-center min-w-[120px] transition-colors",
            viewType === 'net_new'
              ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold"
              : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium"
          )}
        >
          <span className={cn(
            "text-xs uppercase font-bold tracking-wider mb-0.5",
            viewType === 'net_new' ? "text-indigo-400 dark:text-indigo-500" : "text-slate-400 dark:text-slate-500"
          )}>Net New</span>
          {netNewCount.toLocaleString()}
        </button>
        <button
          onClick={() => onViewTypeChange?.('saved')}
          className={cn(
            "px-6 py-3 border-b-2 text-sm flex flex-col items-center min-w-[120px] transition-colors",
            viewType === 'saved'
              ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold"
              : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium"
          )}
        >
          <span className={cn(
            "text-xs uppercase font-bold tracking-wider mb-0.5",
            viewType === 'saved' ? "text-indigo-400 dark:text-indigo-500" : "text-slate-400 dark:text-slate-500"
          )}>Saved</span>
          {savedCount.toLocaleString()}
        </button>
      </div>
    </header>
  )
}
