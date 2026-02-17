'use client'

/**
 * ProspectHoverTable Component
 *
 * Elite Property Prospecting Dashboard — 1:1 design match to reference HTML.
 * Preserves all API routes and columns: Address, Price, Status, AI Score, Beds,
 * Baths, Sqft, Description, Agent Name, Agent Email, Agent Phone(s), Year Built,
 * Last Sale Price/Date, Actions.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Checkbox } from '@/app/components/ui/checkbox'
import { MoreVertical, Mail, Phone, Bookmark, BookmarkCheck } from 'lucide-react'
import TailwindAdminPagination from './TailwindAdminPagination'
import SaveButton from './AddToCrmButton'
import { cn } from '@/app/lib/utils'

// ============================================================================
// Type Definitions (PRESERVED FROM ProspectCheckboxTable)
// ============================================================================

interface Listing {
  listing_id: string
  property_url?: string | null
  street?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  list_price?: number | null
  beds?: number | null
  full_baths?: number | null
  sqft?: number | null
  status?: string | null
  agent_name?: string | null
  agent_email?: string | null
  agent_phone?: string | null
  agent_phone_2?: string | null
  listing_agent_phone_2?: string | null
  listing_agent_phone_5?: string | null
  text?: string | null
  other?: any
  year_built?: number | null
  last_sale_price?: number | null
  last_sale_date?: string | null
  ai_investment_score?: number | null
  created_at?: string
  lat?: number | null
  lng?: number | null
  active?: boolean
  price_per_sqft?: number | null
  in_crm?: boolean
}

interface TableFilters {
  search?: string
  city?: string
  state?: string
  minPrice?: string
  maxPrice?: string
  status?: string
}

interface PaginationControls {
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

interface PaginationStats {
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  loading: boolean
}

interface ProspectHoverTableProps {
  tableName?: string
  listings?: Listing[]
  columns?: string[]
  filters?: TableFilters
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onListingClick?: (listing: Listing) => void
  isDark?: boolean
  selectedIds?: Set<string>
  onSelect?: (listingId: string, selected: boolean) => void
  crmContactIds?: Set<string>
  onSave?: (listing: Listing, saved: boolean) => void
  onAction?: (action: string, listing: Listing) => void
  pagination?: PaginationControls
  onStatsChange?: (stats: PaginationStats) => void
  showSummary?: boolean
  showPagination?: boolean
  category?: string
}

const VALID_TABLE_NAMES = [
  'listings',
  'expired_listings',
  'fsbo_leads',
  'frbo_leads',
  'imports',
  'trash',
  'foreclosure_listings',
  'probate_leads'
] as const

const DEFAULT_COLUMNS = [
  'address',
  'price',
  'status',
  'score',
  'beds',
  'full_baths',
  'sqft',
  'description',
  'agent_name',
  'agent_email',
  'agent_phone',
  'agent_phone_2',
  'listing_agent_phone_2',
  'listing_agent_phone_5',
  'year_built',
  'last_sale_price',
  'last_sale_date',
  'actions'
]

function isValidTableName(tableName: string): boolean {
  return VALID_TABLE_NAMES.includes(tableName as any)
}

function getStatusLabel(listing: Listing, tableName?: string): string {
  // Explicit status from backend always wins
  if (listing.status && listing.status.trim().length > 0) {
    return listing.status
  }

  // Fall back based on source table/category
  switch (tableName) {
    case 'fsbo_leads':
      return 'For Sale'
    case 'frbo_leads':
      return 'For Rent'
    case 'foreclosure_listings':
      return 'Foreclosure'
    case 'imports':
      return 'Imported'
    default:
      // Generic fallback for other tables
      return listing.active ? 'Active' : 'Foreclosure'
  }
}

function getStatusBadgeClasses(status: string, tableName?: string): string {
  // Normalize status to lowercase for comparison
  const normalizedStatus = status.toLowerCase()
  
  // Determine status based on label or table name
  if (normalizedStatus.includes('for sale') || tableName === 'fsbo_leads') {
    return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800'
  }
  if (normalizedStatus.includes('for rent') || tableName === 'frbo_leads') {
    return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800'
  }
  if (normalizedStatus.includes('foreclosure') || tableName === 'foreclosure_listings') {
    return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-800'
  }
  if (normalizedStatus.includes('imported') || tableName === 'imports') {
    return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800'
  }
  // Default: emerald for active/generic status
  return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
}

// ============================================================================
// Main Component - 1:1 Match to TailwindAdmin's HoverTable
// ============================================================================

export default function ProspectHoverTable({
  tableName,
  listings: providedListings,
  columns: providedColumns,
  filters = {},
  sortBy = 'created_at',
  sortOrder = 'desc',
  onListingClick,
  isDark = false,
  selectedIds = new Set(),
  onSelect,
  crmContactIds = new Set(),
  onSave,
  onAction,
  pagination,
  onStatsChange,
  showSummary = true,
  showPagination = true,
  category
}: ProspectHoverTableProps) {
  const columns = providedColumns || [...DEFAULT_COLUMNS]
  const headerTitle = category
    ? `${category.charAt(0).toUpperCase()}${category.slice(1)} Prospects`
    : 'Prospects'
  
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1)
  const [internalPageSize, setInternalPageSize] = useState(30)

  const currentPage = pagination?.currentPage ?? internalCurrentPage
  const pageSize = pagination?.pageSize ?? internalPageSize

  const showSelectionColumn = Boolean(onSelect)
  const getListingKey = (listing: Listing) => listing.listing_id || listing.property_url || ''
  const listingKeysOnPage = Array.from(new Set(listings.map(getListingKey))).filter(Boolean) as string[]
  const hasPageListings = listingKeysOnPage.length > 0
  const allPageSelected =
    showSelectionColumn &&
    hasPageListings &&
    listingKeysOnPage.every((key) => selectedIds.has(key))
  const somePageSelected =
    showSelectionColumn &&
    hasPageListings &&
    listingKeysOnPage.some((key) => selectedIds.has(key)) &&
    !allPageSelected

  const handleSelectAll = () => {
    if (!showSelectionColumn || !onSelect || !hasPageListings) return
    listingKeysOnPage.forEach((key) => {
      onSelect(key, !allPageSelected)
    })
  }

  const handleRowSelectionChange = (listing: Listing) => {
    if (!showSelectionColumn || !onSelect) return
    const key = getListingKey(listing)
    if (!key) return
    const alreadySelected = selectedIds.has(key)
    onSelect(key, !alreadySelected)
  }

  const isRowSelected = (listing: Listing) => {
    const key = getListingKey(listing)
    return Boolean(key && selectedIds.has(key))
  }

  // Fetch listings - PRESERVED API ROUTES (/api/listings/paginated)
  const fetchListings = useCallback(async (page: number) => {
    if (providedListings !== undefined) {
      let filtered = [...providedListings]
      
      if (filters.search) {
        const query = filters.search.toLowerCase()
        filtered = filtered.filter(listing => {
          const address = `${listing.street || ''} ${listing.city || ''} ${listing.state || ''}`.toLowerCase()
          const agentName = (listing.agent_name || '').toLowerCase()
          const agentEmail = (listing.agent_email || '').toLowerCase()
          const listingId = (listing.listing_id || '').toLowerCase()
          return address.includes(query) || agentName.includes(query) || agentEmail.includes(query) || listingId.includes(query)
        })
      }
      
      if (filters.city) {
        filtered = filtered.filter(l => l.city?.toLowerCase() === filters.city?.toLowerCase())
      }
      
      if (filters.state) {
        filtered = filtered.filter(l => l.state?.toLowerCase() === filters.state?.toLowerCase())
      }
      
      if (filters.minPrice) {
        const min = parseInt(filters.minPrice)
        filtered = filtered.filter(l => l.list_price && l.list_price >= min)
      }
      
      if (filters.maxPrice) {
        const max = parseInt(filters.maxPrice)
        filtered = filtered.filter(l => l.list_price && l.list_price <= max)
      }
      
      if (filters.status) {
        filtered = filtered.filter(l => l.status?.toLowerCase().includes(filters.status?.toLowerCase() || ''))
      }
      
      filtered.sort((a, b) => {
        let aVal: any, bVal: any
        
        switch (sortBy) {
          case 'price':
          case 'list_price':
            aVal = a.list_price || 0
            bVal = b.list_price || 0
            break
          case 'date':
          case 'created_at':
            aVal = new Date(a.created_at || 0).getTime()
            bVal = new Date(b.created_at || 0).getTime()
            break
          case 'score':
          case 'ai_investment_score':
            aVal = a.ai_investment_score || 0
            bVal = b.ai_investment_score || 0
            break
          default:
            aVal = new Date(a.created_at || 0).getTime()
            bVal = new Date(b.created_at || 0).getTime()
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
        }
      })
      
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginated = filtered.slice(start, end)
      
      setListings(paginated)
      setTotalCount(filtered.length)
      setLoading(false)
      return
    }
    
    if (!tableName || !isValidTableName(tableName)) {
      setLoading(false)
      setListings([])
      setTotalCount(0)
      return
    }
    
    try {
      setLoading(true)
      
      // PRESERVED API ROUTE: /api/listings/paginated
      const params = new URLSearchParams({
        table: tableName,
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder
      })
      
      if (filters.search) params.append('search', filters.search)
      if (filters.city) params.append('city', filters.city)
      if (filters.state) params.append('state', filters.state)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.status) params.append('status', filters.status)
      
      const response = await fetch(`/api/listings/paginated?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.statusText}`)
      }
      
      const result = await response.json()
      const { data, count, error } = result
      
      if (error) {
        throw new Error(error)
      }
      
      const listingsWithOther = (data || []).map((listing: any) => {
        let parsedOther = listing.other
        if (listing.other && typeof listing.other === 'string') {
          try {
            parsedOther = JSON.parse(listing.other)
          } catch (parseError) {
            parsedOther = null
          }
        }
        
        return {
          ...listing,
          other: parsedOther
        }
      })
      
      setListings(listingsWithOther)
      setTotalCount(count || 0)
      
      if (onStatsChange) {
        onStatsChange({
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
          currentPage: page,
          pageSize,
          loading: false
        })
      }
      
    } catch (error: any) {
      console.error('Error fetching listings:', error)
      setListings([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [providedListings, tableName, filters, sortBy, sortOrder, pageSize, onStatsChange])

  useEffect(() => {
    fetchListings(currentPage)
  }, [fetchListings, currentPage])

  const totalPages = Math.ceil(totalCount / pageSize)
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount)

  const formatAddress = (listing: Listing) => {
    const street = listing.street || 'N/A'
    const cityStateZip = [listing.city, listing.state, listing.zip_code]
      .filter(Boolean)
      .join(', ') || ''
    return { street, cityStateZip }
  }

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatBaths = (baths: number | null | undefined) => {
    if (!baths) return '-'
    return baths.toString()
  }

  const getDescription = (listing: Listing) => {
    if (listing.text) return listing.text
    if (listing.other?.description) return listing.other.description
    if (listing.other?.text) return listing.other.text
    return '-'
  }

  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading listings...</div>
      </div>
    )
  }

  const colSpan = columns.length + (showSelectionColumn ? 1 : 0)

  return (
    <div className="h-full flex flex-col bg-white/50 dark:bg-slate-900/50 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
            <tr className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              {showSelectionColumn && (
                <th className="px-4 py-4 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      aria-label={
                        somePageSelected
                          ? 'Some listings selected. Toggle to select or clear all listings on this page'
                          : allPageSelected
                          ? 'Deselect all listings on this page'
                          : 'Select all listings on this page'
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <Checkbox
                        checked={allPageSelected}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                    </button>
                </th>
              )}
              {columns.includes('address') && (
                <th className="px-4 py-4 min-w-[260px] max-w-[360px]">
                  Address
                </th>
              )}
              {columns.includes('price') && <th className="px-4 py-4">Price</th>}
              {columns.includes('status') && <th className="px-4 py-4">Status</th>}
              {columns.includes('score') && <th className="px-4 py-4">AI Score</th>}
              {columns.includes('beds') && <th className="px-4 py-4">Beds</th>}
              {columns.includes('full_baths') && <th className="px-4 py-4">Baths</th>}
              {columns.includes('sqft') && <th className="px-4 py-4">Sqft</th>}
              {columns.includes('description') && <th className="px-4 py-4">Description</th>}
              {columns.includes('agent_name') && <th className="px-4 py-4">Agent Name</th>}
              {columns.includes('agent_email') && <th className="px-4 py-4">Agent Email</th>}
              {columns.includes('agent_phone') && <th className="px-4 py-4">Agent Phone</th>}
              {columns.includes('agent_phone_2') && <th className="px-4 py-4">Agent Phone 2</th>}
              {columns.includes('listing_agent_phone_2') && <th className="px-4 py-4">Listing Agent Phone 2</th>}
              {columns.includes('listing_agent_phone_5') && <th className="px-4 py-4">Listing Agent Phone 5</th>}
              {columns.includes('year_built') && <th className="px-4 py-4">Year Built</th>}
              {columns.includes('last_sale_price') && <th className="px-4 py-4">Last Sale Price</th>}
              {columns.includes('last_sale_date') && <th className="px-4 py-4">Last Sale Date</th>}
              {columns.includes('actions') && <th className="px-4 py-4" />}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {listings.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No listings found
                </td>
              </tr>
            ) : (
              listings.map((listing) => {
                const { street, cityStateZip } = formatAddress(listing)
                const isSaved =
                  crmContactIds.has(listing.listing_id) ||
                  (listing.property_url ? crmContactIds.has(listing.property_url) : false)

                return (
                  <tr
                    key={listing.listing_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => onListingClick?.(listing)}
                  >
                    {showSelectionColumn && (
                      <td className="px-4 py-4 w-10">
                        <button
                          type="button"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-transparent hover:border-slate-300 focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRowSelectionChange(listing)
                          }}
                          aria-label={`Select listing ${listing.street || listing.listing_id}`}
                        >
                          <Checkbox
                            checked={isRowSelected(listing)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                        </button>
                      </td>
                    )}
                    {columns.includes('address') && (
                      <td className="px-4 py-4 min-w-[260px] max-w-[360px]">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-slate-500">
                            <span className="material-symbols-outlined text-[18px]">location_on</span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                              {street}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {cityStateZip}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    {columns.includes('price') && (
                      <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {formatPrice(listing.list_price)}
                      </td>
                    )}
                    {columns.includes('status') && (
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(getStatusLabel(listing, tableName), tableName)}`}>
                          {getStatusLabel(listing, tableName)}
                        </span>
                      </td>
                    )}
                    {columns.includes('score') && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {listing.ai_investment_score != null ? (
                            <div className="w-8 h-8 rounded-full border-2 border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30">
                              {Math.round(listing.ai_investment_score)}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-lg">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    {columns.includes('beds') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{listing.beds ?? '-'}</td>
                    )}
                    {columns.includes('full_baths') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{formatBaths(listing.full_baths)}</td>
                    )}
                    {columns.includes('sqft') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                        {listing.sqft ? listing.sqft.toLocaleString() : '-'}
                      </td>
                    )}
                    {columns.includes('description') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={getDescription(listing)}>
                        {getDescription(listing)}
                      </td>
                    )}
                    {columns.includes('agent_name') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {listing.agent_name || '-'}
                      </td>
                    )}
                    {columns.includes('agent_email') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {listing.agent_email || '-'}
                      </td>
                    )}
                    {columns.includes('agent_phone') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {listing.agent_phone || '-'}
                      </td>
                    )}
                    {columns.includes('agent_phone_2') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {listing.agent_phone_2 || '-'}
                      </td>
                    )}
                    {columns.includes('listing_agent_phone_2') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {listing.listing_agent_phone_2 || '-'}
                      </td>
                    )}
                    {columns.includes('listing_agent_phone_5') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {listing.listing_agent_phone_5 || '-'}
                      </td>
                    )}
                    {columns.includes('year_built') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{listing.year_built ?? '-'}</td>
                    )}
                    {columns.includes('last_sale_price') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 font-medium">
                        {formatPrice(listing.last_sale_price)}
                      </td>
                    )}
                    {columns.includes('last_sale_date') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {listing.last_sale_date ? new Date(listing.last_sale_date).toLocaleDateString() : '-'}
                      </td>
                    )}
                    {columns.includes('actions') && (
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {listing.agent_email && (
                            <button
                              type="button"
                              onClick={() => onAction?.('email', listing)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                          )}
                          {listing.agent_phone && (
                            <button
                              type="button"
                              onClick={() => onAction?.('call', listing)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                              title="Call"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                          )}
                          {onSave && (
                            <button
                              type="button"
                              onClick={() => onSave(listing, !isSaved)}
                              className={cn(
                                'p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                                isSaved ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                              )}
                              title={isSaved ? 'Unsave prospect' : 'Save prospect'}
                            >
                              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                            </button>
                          )}
                          <SaveButton
                            listing={listing}
                            saved={listing.in_crm || isSaved}
                            onSaved={() => {
                              onSave?.(listing, true)
                              onAction?.('save', listing)
                            }}
                            onUnsaved={() => {
                              onSave?.(listing, false)
                              onAction?.('unsave', listing)
                            }}
                            variant="icon"
                            category={category}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                                title="More Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onListingClick?.(listing)}>
                                View Details
                              </DropdownMenuItem>
                              {listing.property_url && (
                                <DropdownMenuItem onClick={() => window.open(listing.property_url || '', '_blank')}>
                                  Open Property URL
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <TailwindAdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={(page) => pagination?.onPageChange(page) ?? setInternalCurrentPage(page)}
          isDark={isDark}
        />
      )}
    </div>
  )
}
