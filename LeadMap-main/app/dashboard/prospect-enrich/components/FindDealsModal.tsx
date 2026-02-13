'use client'

/**
 * FindDealsModal — Elite Property Prospecting Dashboard design (1:1 reference HTML).
 * Opens when user clicks Compose. Same size as current modal (max-w-4xl max-h-[90vh]).
 * Tailwind design heuristics: fd-* colors, Filters sidebar, Find Deals main, purple tabs/CTA.
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
  { id: 'price', label: 'Price Range', pinned: true },
  { id: 'location', label: 'Location', pinned: true },
  { id: 'ai_score', label: 'AI Investment Score', pinned: true },
  { id: 'status', label: 'Status', pinned: false },
  { id: 'beds', label: 'Bedrooms', pinned: false },
  { id: 'baths', label: 'Bathrooms', pinned: false },
  { id: 'sqft', label: 'Square Footage', pinned: false },
  { id: 'year', label: 'Year Built', pinned: false },
]

const APP_SIDEBAR_SECTIONS = [
  {
    id: 'home',
    title: 'Home',
    items: [
      { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
      { id: 'maps', icon: 'map', label: 'Maps' },
    ],
  },
  {
    id: 'prospect-enrich',
    title: 'Prospect & Enrich',
    items: [
      { id: 'all-prospects', icon: 'group', label: 'All Prospects' },
      { id: 'for-sale', icon: 'sell', label: 'For Sale' },
      { id: 'for-rent', icon: 'key', label: 'For Rent' },
      { id: 'foreclosures', icon: 'gavel', label: 'Foreclosures', active: true },
      { id: 'probate', icon: 'policy', label: 'Probate' },
      { id: 'expired', icon: 'timer_off', label: 'Expired Listings' },
      { id: 'imports', icon: 'cloud_upload', label: 'Imports' },
    ],
  },
  {
    id: 'crm',
    title: 'Customer Relationship',
    items: [
      { id: 'lists', icon: 'list_alt', label: 'Lists' },
      { id: 'deals', icon: 'handshake', label: 'Deals' },
      { id: 'calendar', icon: 'calendar_month', label: 'Calendar' },
    ],
  },
  {
    id: 'email-marketing',
    title: 'Email Marketing',
    items: [
      { id: 'unibox', icon: 'mail', label: 'Unibox' },
      { id: 'campaigns', icon: 'send', label: 'Email Campaigns' },
      { id: 'analytics', icon: 'analytics', label: 'Email Analytics' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools & Automation',
    items: [{ id: 'monitoring', icon: 'monitoring', label: 'Analytics' }],
  },
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
      {/* Same size as current modal: max-w-4xl max-h-[90vh] — 1:1 reference layout */}
      <div
        className={cn(
          'bg-fd-background-light border border-fd-border-light shadow-modal rounded-2xl flex overflow-hidden w-full max-w-4xl max-h-[90vh] font-display'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-screen max-h-full min-h-0 relative overflow-x-hidden flex-1 p-0 gap-0">
          {/* Left Sidebar — selector parity: body > div.flex.h-screen.relative.overflow-x-hidden > aside */}
          <aside className="w-64 flex flex-col shrink-0 overflow-y-auto no-scrollbar py-4 px-3 bg-fd-sidebar-lavender sidebar-gradient-border rounded-l-[24px] relative z-20 my-3 ml-3 mr-0">
            {APP_SIDEBAR_SECTIONS.map((section) => (
              <div key={section.id} className="mb-5">
                <div className="px-3 mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-fd-text-secondary uppercase tracking-wider">{section.title}</span>
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                        item.active
                          ? 'text-fd-primary bg-white shadow-sm ring-1 ring-black/5'
                          : 'text-fd-text-secondary hover:bg-white/80 hover:text-fd-primary'
                      )}
                      aria-label={item.label}
                    >
                      <span className={cn('material-symbols-outlined text-[20px]', item.active && 'fill-1')}>{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <div className="flex-1 bg-fd-surface-light rounded-r-[20px] rounded-l-[0] shadow-sm flex overflow-hidden border-l-0 border-fd-border-light relative z-10 my-3 ml-0 mr-3 min-w-0">
            {/* Sidebar — Filters (1:1 reference: w-80 bg-white border-r) */}
            <aside className="w-80 bg-fd-surface-light border-r border-fd-border-light flex flex-col overflow-hidden shrink-0">
          <div className="p-6 flex items-center justify-between border-b border-fd-border-light shrink-0">
            <h2 className="text-base font-bold text-fd-text-primary">Filters</h2>
            <button
              type="button"
              className="text-sm text-blue-500 font-medium hover:text-blue-600"
              aria-label="Reset all filters"
            >
              Reset All
            </button>
          </div>
          <div className="flex-1 overflow-y-auto find-deals-no-scrollbar">
            {FILTER_SECTIONS.map((section) => (
              <div key={section.id} className="border-b border-fd-border-light">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 group transition-colors"
                  aria-expanded="false"
                  aria-label={section.label}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-fd-text-secondary text-lg group-hover:text-fd-text-primary transition-colors">
                      chevron_right
                    </span>
                    <span className="text-sm font-semibold text-fd-text-primary">{section.label}</span>
                  </div>
                  {section.pinned && (
                    <span className="material-symbols-outlined fill-1 text-blue-500 text-[20px]" aria-hidden>
                      push_pin
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="p-6 shrink-0">
            <button
              type="button"
              className="w-full border border-fd-border-light rounded-lg py-2.5 text-sm font-medium text-fd-text-secondary hover:bg-slate-50 hover:text-fd-text-primary transition-colors"
            >
              More Filters (5)
            </button>
          </div>
            </aside>

            {/* Main — Find Deals content (1:1 reference) */}
            <main className="flex-1 bg-fd-surface-light overflow-hidden flex flex-col relative min-w-0">
          <div className="px-8 pt-8 pb-4 shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-fd-text-primary">Find Deals</h1>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-fd-text-secondary hover:text-fd-text-primary hover:bg-slate-50 transition-colors"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
                <button
                  type="button"
                  onClick={onImport}
                  className="bg-fd-surface-light border border-fd-border-light text-fd-text-secondary text-sm font-medium rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-slate-50"
                >
                  Import
                  <span className="material-symbols-outlined text-lg">expand_more</span>
                </button>
                <button
                  type="button"
                  onClick={onResearchWithAI}
                  className="bg-purple-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 font-medium text-sm hover:bg-purple-700 shadow-sm shadow-purple-200"
                >
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                  Research with AI
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-lg">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]" aria-hidden>
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search places..."
                  className="w-full border border-fd-border-light rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-fd-text-primary bg-fd-surface-light"
                />
              </div>
              <button
                type="button"
                className="border border-fd-border-light rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm text-fd-text-secondary font-medium hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                Default View
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </button>
              <button
                type="button"
                className="border border-fd-border-light rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm text-fd-text-secondary font-medium hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                Hide Filters
              </button>
              <button
                type="button"
                className="border border-fd-border-light rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm text-fd-text-secondary font-medium hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
                Search Settings
              </button>
            </div>
            <div className="flex gap-8 mt-6 border-b border-fd-border-light">
              <button
                type="button"
                onClick={() => onViewTypeChange('total')}
                className={cn(
                  'pb-3 px-2 border-b-2 text-xs uppercase tracking-wide flex flex-col items-center gap-1 transition-colors',
                  viewType === 'total'
                    ? 'border-purple-600 text-purple-700 font-semibold'
                    : 'border-transparent text-gray-500 font-medium hover:text-gray-700'
                )}
              >
                <span className={cn('text-[10px] font-medium', viewType === 'total' ? 'text-gray-500' : 'text-gray-400')}>TOTAL</span>
                <span className="text-sm">{totalCount.toLocaleString()}</span>
              </button>
              <button
                type="button"
                onClick={() => onViewTypeChange('net_new')}
                className={cn(
                  'pb-3 px-2 border-b-2 text-xs uppercase tracking-wide flex flex-col items-center gap-1 transition-colors',
                  viewType === 'net_new'
                    ? 'border-purple-600 text-purple-700 font-semibold'
                    : 'border-transparent text-gray-500 font-medium hover:text-gray-700'
                )}
              >
                <span className={cn('text-[10px] font-medium', viewType === 'net_new' ? 'text-gray-500' : 'text-gray-400')}>NET NEW</span>
                <span className="text-sm">{netNewCount.toLocaleString()}</span>
              </button>
              <button
                type="button"
                onClick={() => onViewTypeChange('saved')}
                className={cn(
                  'pb-3 px-2 border-b-2 text-xs uppercase tracking-wide flex flex-col items-center gap-1 transition-colors',
                  viewType === 'saved'
                    ? 'border-purple-600 text-purple-700 font-semibold'
                    : 'border-transparent text-gray-500 font-medium hover:text-gray-700'
                )}
              >
                <span className={cn('text-[10px] font-medium', viewType === 'saved' ? 'text-gray-500' : 'text-gray-400')}>SAVED</span>
                <span className="text-sm">{savedCount.toLocaleString()}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-fd-surface-light min-h-0">
            <table className="w-full min-w-[1200px]" role="grid">
              <thead className="bg-fd-surface-light sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-4 w-12 border-b border-fd-border-light">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" aria-label="Select all" />
                  </th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Address</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Price</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Status</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">AI Score</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Beds</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Baths</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Sqft</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Description</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Agent Name</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">Agent Email</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-fd-border-light">AI PI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fd-border-light">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-4 py-8 text-center text-fd-text-secondary">
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
                          'hover:bg-slate-50 group transition-colors',
                          isSelected && 'bg-fd-primary-bg/50'
                        )}
                        onClick={() => setSelectedId(isSelected ? null : key)}
                      >
                        <td className="p-4 align-top pt-5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => setSelectedId(isSelected ? null : key)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex gap-3">
                            <div className="bg-blue-100 text-blue-600 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[18px]">location_on</span>
                            </div>
                            <div>
                              <div className="font-medium text-sm text-fd-text-primary">{street}</div>
                              <div className="text-xs text-fd-text-secondary mt-0.5">{cityStateZip}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-bold text-fd-text-primary align-top pt-5">{formatPrice(listing.list_price)}</td>
                        <td className="p-4 align-top pt-5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                            {listing.status || (listing.active ? 'Active' : 'Foreclosures')}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">
                          {listing.ai_investment_score != null ? Math.round(listing.ai_investment_score) : '-'}
                        </td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">{listing.beds ?? '-'}</td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">{listing.full_baths ?? '-'}</td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">{listing.sqft != null ? listing.sqft.toLocaleString() : '-'}</td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">-</td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">-</td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">-</td>
                        <td className="p-4 text-sm text-fd-text-secondary align-top pt-5">-</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-4 border-t border-fd-border-light bg-fd-surface-light shrink-0 flex items-center justify-between flex-wrap gap-2">
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
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2 px-4 shadow-lg shadow-blue-200 flex items-center gap-2 font-medium text-sm transition-all"
              >
                <span className="material-symbols-outlined fill-1 text-[18px]">mail</span>
                Compose email
              </button>
            )}
          </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
