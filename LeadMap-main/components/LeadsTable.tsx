'use client'

import { useState, useMemo, memo } from 'react'
import { ExternalLink, Search, Filter, RefreshCw } from 'lucide-react'
import AddToCrmButton from '@/app/dashboard/prospect-enrich/components/AddToCrmButton'

interface Listing {
  listing_id: string
  property_url: string
  street?: string | null
  unit?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  list_price?: number | null
  list_price_min?: number | null
  list_price_max?: number | null
  beds?: number | null
  full_baths?: number | null
  sqft?: number | null
  year_built?: number | null
  status?: string | null
  mls?: string | null
  agent_name?: string | null
  agent_email?: string | null
  agent_phone?: string | null
  price_per_sqft?: number | null
  ai_investment_score?: number | null
  active?: boolean
  created_at?: string
  listing_source_name?: string | null
}

interface LeadsTableProps {
  listings: Listing[]
  loading: boolean
  onRefresh: () => void
  onEnrich?: (id: string) => void
  onGenerateEmail?: (lead: Listing) => void
  onAddToCrm?: (lead: Listing) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

function LeadsTable({ listings, loading, onRefresh, onEnrich, onGenerateEmail, onAddToCrm, selectedIds: externalSelectedIds, onSelectionChange }: LeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [zipFilter, setZipFilter] = useState('')
  const [dropFilter, setDropFilter] = useState('')
  const [sortBy, setSortBy] = useState<'price' | 'drop' | 'days'>('price')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set())
  
  // Use external selection if provided, otherwise use internal
  const selectedIds = externalSelectedIds !== undefined ? externalSelectedIds : internalSelectedIds
  const setSelectedIds = onSelectionChange || setInternalSelectedIds

  const filteredListings = useMemo(() => {
    let filtered = listings.filter(listing => {
      const address = listing.street || ''
      const city = listing.city || ''
      const state = listing.state || ''
      
      const matchesSearch = 
        address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        state.toLowerCase().includes(searchTerm.toLowerCase())

      const price = listing.list_price || 0
      const matchesPrice = 
        (!priceRange.min || price >= parseInt(priceRange.min)) &&
        (!priceRange.max || price <= parseInt(priceRange.max))

      const zip = listing.zip_code || ''
      const matchesZip = !zipFilter || zip.includes(zipFilter)

      // Calculate price drop if we have min/max prices
      const priceDrop = listing.list_price_min && listing.list_price ? 
        ((listing.list_price_min - listing.list_price) / listing.list_price_min * 100) : 0
      
      const matchesDrop = 
        !dropFilter || 
        (dropFilter === 'high' && priceDrop >= 10) ||
        (dropFilter === 'medium' && priceDrop >= 5 && priceDrop < 10) ||
        (dropFilter === 'low' && priceDrop > 0 && priceDrop < 5)

      return matchesSearch && matchesPrice && matchesZip && matchesDrop
    })

    // Sort listings
    filtered.sort((a, b) => {
      let aValue: number = 0, bValue: number = 0

      switch (sortBy) {
        case 'price':
          aValue = a.list_price || 0
          bValue = b.list_price || 0
          break
        case 'drop':
          const aDrop = a.list_price_min && a.list_price ? 
            ((a.list_price_min - a.list_price) / a.list_price_min * 100) : 0
          const bDrop = b.list_price_min && b.list_price ? 
            ((b.list_price_min - b.list_price) / b.list_price_min * 100) : 0
          aValue = aDrop
          bValue = bDrop
          break
        case 'days':
          // Use created_at as proxy for days on market
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
          aValue = aDate
          bValue = bDate
          break
        default:
          return 0
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

    return filtered
  }, [listings, searchTerm, priceRange, zipFilter, dropFilter, sortBy, sortOrder])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleSort = (column: 'price' | 'drop' | 'days') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading leads...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                id="search"
                name="search"
                type="text"
                placeholder="Search by address, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-full"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <input
              id="min-price"
              name="min-price"
              type="number"
              placeholder="Min Price"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              className="input-field w-32"
            />
            <input
              id="max-price"
              name="max-price"
              type="number"
              placeholder="Max Price"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              className="input-field w-32"
            />
            <input
              id="zip-filter"
              name="zip-filter"
              type="text"
              placeholder="ZIP Code"
              value={zipFilter}
              onChange={(e) => setZipFilter(e.target.value)}
              className="input-field w-32"
            />
            <select
              id="drop-filter"
              name="drop-filter"
              value={dropFilter}
              onChange={(e) => setDropFilter(e.target.value)}
              className="input-field w-40"
            >
              <option value="">All Drops</option>
              <option value="high">High (10%+)</option>
              <option value="medium">Medium (5-10%)</option>
              <option value="low">Low (1-5%)</option>
            </select>
            <button
              onClick={onRefresh}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600 dark:text-gray-300">
          Showing {filteredListings.length} of {listings.length} leads
        </p>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={listings.length > 0 && selectedIds.size === listings.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(listings.map(l => l.listing_id)))
                      } else {
                        setSelectedIds(new Set())
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('price')}
                >
                  Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('drop')}
                >
                  % Drop {sortBy === 'drop' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('days')}
                >
                  Days on Market {sortBy === 'days' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Agent Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  AI Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredListings.map((listing) => {
                const address = listing.street || 'N/A'
                const city = listing.city || ''
                const state = listing.state || ''
                const zip = listing.zip_code || ''
                const price = listing.list_price || 0
                const priceDrop = listing.list_price_min && listing.list_price ? 
                  ((listing.list_price_min - listing.list_price) / listing.list_price_min * 100) : 0
                const daysOnMarket = listing.created_at ? 
                  Math.floor((Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
                
                const isSelected = selectedIds.has(listing.listing_id)
                return (
                <tr key={listing.listing_id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const newSet = new Set(selectedIds)
                        if (e.target.checked) {
                          newSet.add(listing.listing_id)
                        } else {
                          newSet.delete(listing.listing_id)
                        }
                        setSelectedIds(newSet)
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {address} {listing.unit ? `Unit ${listing.unit}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {city}, {state} {zip}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {price > 0 ? formatPrice(price) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      priceDrop >= 10 
                        ? 'bg-red-900 text-red-300'
                        : priceDrop >= 5
                        ? 'bg-yellow-900 text-yellow-300'
                        : priceDrop > 0
                        ? 'bg-green-900 text-green-300'
                        : 'bg-gray-900 text-gray-300'
                    }`}>
                      {priceDrop > 0 ? `${priceDrop.toFixed(1)}%` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {daysOnMarket} days
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {listing.status && (
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          listing.status.toLowerCase().includes('expired') || listing.status.toLowerCase().includes('sold')
                            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                            : listing.status.toLowerCase().includes('pending')
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                        }`}>
                          {listing.status}
                        </span>
                      )}
                      {listing.active === false && (
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {listing.agent_email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {typeof listing.ai_investment_score === 'number' ? (
                      <span 
                        title="AI Investment Score"
                        className="text-sm text-green-600 dark:text-green-400 font-medium"
                      >
                        {listing.ai_investment_score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {listing.listing_source_name || listing.mls || 'N/A'}
                    </div>
                    {listing.property_url && (
                      <a
                        href={listing.property_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 dark:text-primary-400 hover:text-blue-800 dark:hover:text-primary-300 text-xs mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {onEnrich && (
                        <button
                          onClick={() => onEnrich(listing.listing_id)}
                          disabled={listing.agent_email !== null && listing.agent_email !== undefined}
                          className="text-xs text-blue-600 dark:text-blue-500 hover:text-blue-800 dark:hover:text-blue-400 disabled:text-gray-400 dark:disabled:text-gray-500"
                          title={listing.agent_email ? 'Already enriched' : 'Enrich lead data'}
                        >
                          Enrich
                        </button>
                      )}
                      {onGenerateEmail && (
                        <button
                          onClick={() => onGenerateEmail(listing)}
                          className="text-xs text-purple-600 dark:text-purple-500 hover:text-purple-800 dark:hover:text-purple-400"
                        >
                          Email
                        </button>
                      )}
                      {onAddToCrm && (
                        <AddToCrmButton
                          listing={listing}
                          onAdded={onAddToCrm}
                          variant="compact"
                        />
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredListings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No leads found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(LeadsTable)
