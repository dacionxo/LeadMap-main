'use client'

/**
 * FindDealsModal — Elite Property Prospecting Dashboard design (1:1 reference HTML).
 * Opens when user clicks Compose. Same size as current modal (max-w-4xl max-h-[90vh]).
 * Matches ProspectHoverTable column widths (px-4 py-4) and Tailwind design heuristics.
 */

import { useState, useMemo, useEffect } from 'react'
import { Checkbox } from '@/app/components/ui/checkbox'
import TailwindAdminPagination from './TailwindAdminPagination'
import { cn } from '@/app/lib/utils'
import type { Listing } from '../hooks/useProspectData'

interface FindDealsModalProps {
  isOpen: boolean
  onClose: () => void
  listings: Listing[]
  totalCount: number
  netNewCount: number
  savedCount: number
  viewType: 'total' | 'net_new' | 'saved'
  onViewTypeChange: (v: 'total' | 'net_new' | 'saved') => void
  searchQuery: string
  onSearchChange: (q: string) => void
  currentPage: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onComposeLead?: (listing: Listing) => void
  onImport?: () => void
  onResearchWithAI?: () => void
  isDark?: boolean
  /** When opening from a row compose action, pre-select this listing id */
  initialSelectedListingId?: string | null
}

const FILTER_SECTIONS = [
  { id: 'price', label: 'Price Range', icon: 'expand_more', pinned: true },
  { id: 'location', label: 'Location', icon: 'expand_more', pinned: true },
  { id: 'ai_score', label: 'AI Investment Score', icon: 'expand_more', pinned: true },
  { id: 'status', label: 'Status', icon: 'chevron_right', pinned: false },
  { id: 'beds', label: 'Bedrooms', icon: 'chevron_right', pinned: false },
  { id: 'baths', label: 'Bathrooms', icon: 'chevron_right', pinned: false },
  { id: 'sqft', label: 'Square Footage', icon: 'chevron_right', pinned: false },
  { id: 'year', label: 'Year Built', icon: 'chevron_right', pinned: false },
]

function formatAddress(listing: Listing) {
  const street = listing.street || 'N/A'
  const cityStateZip = [listing.city, listing.state, listing.zip_code].filter(Boolean).join(', ') || ''
  return { street, cityStateZip }
}

function formatPrice(price: number | null | undefined) {
  if (!price) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)
}

export default function FindDealsModal({
  isOpen,
  onClose,
  listings,
  totalCount,
  netNewCount,
  savedCount,
  viewType,
  onViewTypeChange,
  searchQuery,
  onSearchChange,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onComposeLead,
  onImport,
  onResearchWithAI,
  isDark = false,
  initialSelectedListingId,
}: FindDealsModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedListingId ?? null)

  useEffect(() => {
    if (isOpen && initialSelectedListingId) setSelectedId(initialSelectedListingId)
    if (!isOpen) setSelectedId(null)
  }, [isOpen, initialSelectedListingId])

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings
    const q = searchQuery.toLowerCase()
    return listings.filter((l) => {
      const addr = `${l.street || ''} ${l.city || ''} ${l.state || ''}`.toLowerCase()
      return addr.includes(q) || (l.city?.toLowerCase().includes(q)) || (l.state?.toLowerCase().includes(q)) || (l.zip_code?.includes(searchQuery))
    })
  }, [listings, searchQuery])

  const selectedListing = useMemo(() => filteredListings.find((l) => (l.listing_id || l.property_url) === selectedId), [filteredListings, selectedId])

  const currentViewTotal = viewType === 'total' ? totalCount : viewType === 'net_new' ? netNewCount : savedCount

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      {/* Same size as current modal: max-w-4xl max-h-[90vh] */}
      <div
        className={cn(
          'prospect-enrich-glass dark:bg-slate-900/95 border border-white/50 dark:border-slate-700 shadow-glass rounded-[2rem] flex overflow-hidden w-full max-w-4xl max-h-[90vh]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar - Filters (reference: w-80 glass-sidebar) */}
        <aside className="w-64 flex-shrink-0 prospect-enrich-glass-sidebar dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-y-auto prospect-enrich-scrollbar-hide">
          <div className="p-4 border-b border-slate-200/60 dark:border-slate-700 sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Filters</h2>
            <button type="button" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
              Reset All
            </button>
          </div>
          <div className="flex-1 flex flex-col pt-2">
            {FILTER_SECTIONS.map((section) => (
              <div key={section.id} className="border-b border-slate-100 dark:border-slate-800">
                <div className="group flex items-center justify-between px-4 py-3 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] group-hover:text-slate-600 dark:group-hover:text-slate-300">
                      {section.icon}
                    </span>
                    <span className={cn('text-[13px]', section.pinned ? 'font-semibold text-slate-700 dark:text-slate-300' : 'font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200')}>
                      {section.label}
                    </span>
                  </div>
                  {section.pinned && (
                    <span className="material-symbols-outlined fill-1 text-indigo-500 text-[16px]">
                      push_pin
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="p-4 mt-auto">
              <button type="button" className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-medium text-xs hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                More Filters (5)
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-white/50 dark:bg-slate-900/50 relative">
          <header className="p-4 pb-2 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Find Deals</h1>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
                <button
                  type="button"
                  onClick={onImport}
                  className="bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs transition-all flex items-center gap-1.5"
                >
                  Import
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
                <button
                  type="button"
                  onClick={onResearchWithAI}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-4 py-1.5 rounded-lg shadow-lg shadow-indigo-500/30 text-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  Research with AI
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search places..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
              <button type="button" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                Default View
                <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
              </button>
              <button type="button" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Hide Filters
              </button>
              <button type="button" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">settings</span>
                Search Settings
              </button>
            </div>
            <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onViewTypeChange('total')}
                className={cn(
                  'px-4 py-2.5 border-b-2 text-xs flex flex-col items-center min-w-[90px] transition-colors',
                  viewType === 'total'
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium'
                )}
              >
                <span className={cn('text-[10px] uppercase font-bold tracking-wider mb-0.5', viewType === 'total' ? 'text-indigo-400' : 'text-slate-400')}>Total</span>
                {totalCount.toLocaleString()}
              </button>
              <button
                type="button"
                onClick={() => onViewTypeChange('net_new')}
                className={cn(
                  'px-4 py-2.5 border-b-2 text-xs flex flex-col items-center min-w-[90px] transition-colors',
                  viewType === 'net_new'
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium'
                )}
              >
                <span className={cn('text-[10px] uppercase font-bold tracking-wider mb-0.5', viewType === 'net_new' ? 'text-indigo-400' : 'text-slate-400')}>Net New</span>
                {netNewCount.toLocaleString()}
              </button>
              <button
                type="button"
                onClick={() => onViewTypeChange('saved')}
                className={cn(
                  'px-4 py-2.5 border-b-2 text-xs flex flex-col items-center min-w-[90px] transition-colors',
                  viewType === 'saved'
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium'
                )}
              >
                <span className={cn('text-[10px] uppercase font-bold tracking-wider mb-0.5', viewType === 'saved' ? 'text-indigo-400' : 'text-slate-400')}>Saved</span>
                {savedCount.toLocaleString()}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto px-4 pb-4 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
                <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-4 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-4">Address</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">AI Score</th>
                  <th className="px-4 py-4">Beds</th>
                  <th className="px-4 py-4">Baths</th>
                  <th className="px-4 py-4">Sqft</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No listings found
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => {
                    const key = listing.listing_id || listing.property_url || ''
                    const isSelected = selectedId === key
                    const { street, cityStateZip } = formatAddress(listing)
                    return (
                      <tr
                        key={key}
                        className={cn(
                          'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer',
                          isSelected && 'bg-indigo-50/50 dark:bg-indigo-900/20'
                        )}
                        onClick={() => setSelectedId(isSelected ? null : key)}
                      >
                        <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => setSelectedId(isSelected ? null : key)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400">
                              <span className="material-symbols-outlined text-[18px]">location_on</span>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">{street}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cityStateZip}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">{formatPrice(listing.list_price)}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                            {listing.status || (listing.active ? 'Active' : 'Foreclosures')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {listing.ai_investment_score != null ? (
                              <div className="w-8 h-8 rounded-full border-2 border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30">
                                {Math.round(listing.ai_investment_score)}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-lg">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{listing.beds ?? '-'}</td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{listing.full_baths ?? '-'}</td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{listing.sqft ? listing.sqft.toLocaleString() : '-'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
            <TailwindAdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={currentViewTotal}
              onPageChange={onPageChange}
              isDark={isDark}
            />
            {selectedListing && onComposeLead && (
              <button
                type="button"
                onClick={() => onComposeLead(selectedListing)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 rounded-lg px-4 py-2 flex items-center gap-2 font-medium text-sm transition-colors"
              >
                Compose email
                <span className="material-symbols-outlined text-[18px]">mail</span>
              </button>
            )}
          </footer>
        </main>
      </div>
    </div>
  )
}
