'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import AppNavSidebar from '../../components/AppNavSidebar'
import DashboardLayout from '../../components/DashboardLayout'
import DealsNavbar from '../../crm/deals/components/DealsNavbar'
import Link from 'next/link'

interface List {
  id: string
  name: string
  type: 'people' | 'properties'
}

interface Listing {
  listing_id: string
  street?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  list_price?: number | null
  beds?: number | null
  full_baths?: number | null
  sqft?: number | null
  status?: string | null
  ai_investment_score?: number | null
  property_url?: string | null
  agent_name?: string | null
  agent_email?: string | null
  agent_phone?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
  job_title?: string | null
  primary_photo?: string | null
  year_built?: number | null
  property_type?: string | null
  lot_size?: string | null
  [key: string]: unknown
}

interface ListPaginatedResponse {
  data: Listing[]
  count: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  list: { id: string; name: string; type: string }
}

/* ─── AI Score badge (reference: rounded-md, blue or emerald bg) ─── */
function AIScoreCell({ score }: { score?: number | null }) {
  if (score == null || score === 0) {
    return <span className="text-slate-300 text-lg">-</span>
  }
  const rounded = Math.round(score)
  const isHigh = rounded >= 80
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold leading-none border ${
        isHigh
          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
          : 'bg-blue-50 text-blue-600 border-blue-100'
      }`}
    >
      {rounded}
    </span>
  )
}

/* ─── Status badge (reference: non-rounded, 10px bold, border) ─── */
function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null
  const s = String(status).toLowerCase()
  const isPending = s.includes('pending')
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide leading-relaxed border ${
        isPending
          ? 'bg-amber-50 text-amber-600 border-amber-100'
          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
      }`}
    >
      {status}
    </span>
  )
}

/** Must be inside DashboardLayout. */
function ListDetailContent() {
  const params = useParams()
  const router = useRouter()
  const listId = params.id as string

  const [list, setList] = useState<List | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchListData = useCallback(async () => {
    if (!listId) return

    try {
      setLoading(true)
      const searchParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
      })

      const response = await fetch(`/api/lists/${listId}/paginated?${searchParams}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
          return
        }
        if (response.status === 404) {
          router.push('/dashboard/lists')
          return
        }
        setListings([])
        setTotalCount(0)
        setTotalPages(0)
        return
      }

      const data: ListPaginatedResponse = await response.json()
      setList({
        id: data.list.id,
        name: data.list.name,
        type: data.list.type as 'people' | 'properties',
      })
      setTotalCount(data.count)
      setTotalPages(data.totalPages)
      setListings(data.data || [])
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [listId, currentPage, pageSize, sortBy, sortOrder, debouncedSearch, router])

  useEffect(() => {
    fetchListData()
  }, [fetchListData])

  const handleRemoveFromList = useCallback(
    async (listing: Listing, e: React.MouseEvent) => {
      e.stopPropagation()
      const isPeople = list?.type === 'people'
      const itemId = isPeople
        ? ((listing as any).contact_id || listing.listing_id)
        : (listing.listing_id || listing.property_url)
      if (!itemId || !listId) return
      if (!confirm('Remove this item from the list?')) return

      try {
        setDeletingId(String(itemId))
        const response = await fetch(`/api/lists/${listId}/remove`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: String(itemId),
            itemType: isPeople ? 'contact' : 'listing',
          }),
        })

        if (response.ok) {
          await fetchListData()
        } else {
          const err = await response.json().catch(() => ({}))
          alert(err.error || 'Failed to remove item')
        }
      } catch {
        alert('Failed to remove item')
      } finally {
        setDeletingId(null)
      }
    },
    [listId, list?.type, fetchListData]
  )

  const handleExportCSV = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/lists/${listId}/paginated?page=1&pageSize=1000${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`,
        { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      )
      if (!response.ok) return
      const { data: items } = await response.json()
      const rows = items || []

      const headers = [
        'Listing ID', 'Address', 'City', 'State', 'Zip Code',
        'Price', 'Beds', 'Baths', 'Sqft', 'Status',
        'Agent Name', 'Agent Email', 'Agent Phone',
      ]
      const csvRows = rows.map((r: Listing) => [
        r.listing_id || '', r.street || '', r.city || '', r.state || '',
        r.zip_code || '', r.list_price?.toString() || '', r.beds?.toString() || '',
        r.full_baths?.toString() || '', r.sqft?.toString() || '', r.status || '',
        r.agent_name || '', r.agent_email || '', r.agent_phone || '',
      ])
      const csv =
        headers.join(',') +
        '\n' +
        csvRows
          .map((row: (string | number)[]) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
          .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(list?.name || 'list').replace(/[^a-z0-9]/gi, '_')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export')
    }
  }, [listId, list?.name, debouncedSearch])

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(listings.map((l) => l.listing_id || (l as any).contact_id || '').filter(Boolean)))
    }
  }

  const handleRowClick = (listing: Listing) => {
    const id = listing.listing_id || listing.property_url || ''
    if (selectedListing && (selectedListing.listing_id || selectedListing.property_url) === id) {
      setSelectedListing(null)
    } else {
      setSelectedListing(listing)
    }
  }

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endRecord = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount)

  const getListingId = (listing: Listing) =>
    listing.listing_id || listing.property_url || ''

  if (!listId) {
    return null
  }

  if (loading && !list) {
    return (
      <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
        <DealsNavbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
          <span className="ml-3 text-slate-500 font-medium">Loading list...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="-mt-[30px]">
        <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
          <DealsNavbar />
          <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
            <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
              <AppNavSidebar />
              <div className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-blue-700">
            {/* Decorative blue glow - matches deals page */}
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
              aria-hidden
            />

            {/* ─── HEADER (matches /dashboard/lists style) ─── */}
            <header className="shrink-0 z-20 px-8 py-6">
              <div className="flex items-end justify-between mb-8">
                <div>
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    <Link href="/dashboard/lists" className="hover:text-blue-600 transition-colors">
                      Lists
                    </Link>
                    <span className="material-symbols-outlined text-[12px] text-slate-400">chevron_right</span>
                    <span className="text-slate-700 dark:text-slate-300">{list?.name ?? '…'}</span>
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {list?.name ?? '…'} <span className="text-blue-500">List</span>
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-base">
                    Manage and track your {list?.type === 'people' ? 'contacts' : 'property records'} in this list efficiently.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {}}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-label="Import"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">upload_file</span>
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                    aria-label="Add records"
                  >
                    Add records
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {}}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-label="Research with AI"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">auto_awesome</span>
                    Research with AI
                  </button>
                  <button
                    type="button"
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-label="More options"
                  >
                    <span className="material-symbols-outlined text-[18px]">more_vert</span>
                  </button>
                </div>
              </div>
            </header>

            {/* ─── MAIN CONTENT (matches /dashboard/lists padding) ─── */}
            <main className="flex-1 overflow-auto custom-scrollbar px-8 pb-8 flex flex-col min-h-0">
              {/* ─── TOOLBAR (matches /dashboard/lists: search + View/Sort/Filter) ─── */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 flex items-center relative group max-w-md">
                    <span
                      className="absolute left-3 material-symbols-outlined text-slate-400 group-focus-within:text-blue-600 transition-colors z-10 text-[18px]"
                      aria-hidden
                    >
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={list?.type === 'properties' ? 'Search properties...' : 'Search contacts...'}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      aria-label="Search"
                    />
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-label="View options"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">grid_view</span>
                    View
                    <span className="material-symbols-outlined text-[18px] text-gray-300 dark:text-slate-500">expand_more</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-label="Sort options"
                  >
                    Sort: Modified
                    <span className="material-symbols-outlined text-[18px] text-gray-300 dark:text-slate-500">expand_more</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-label="Filter options"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">filter_list</span>
                    Filter
                  </button>
                </div>
              </div>

              {/* ─── TABLE + DETAIL PANEL LAYOUT ─── */}
              <div className="flex gap-4 h-full overflow-hidden">
                {/* ─── TABLE CARD (matches lists index table styling) ─── */}
                <div className="bg-white dark:bg-slate-800/50 border border-gray-200/80 dark:border-slate-600 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col relative transition-all duration-300">
                  <div className="overflow-auto custom-scrollbar flex-1 pb-10">
                    {loading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
                        <span className="ml-3 text-slate-500 font-medium">Loading...</span>
                      </div>
                    ) : listings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-32 h-32 mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-5xl">
                          {list?.type === 'properties' ? '🏠' : '👥'}
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                          {searchQuery ? 'No matches found' : 'This list is empty'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
                          {searchQuery
                            ? 'Try adjusting your search to find what you\'re looking for.'
                            : `Add ${list?.type === 'properties' ? 'properties' : 'contacts'} to this list to get started.`}
                        </p>
                        {!searchQuery && (
                          <button
                            type="button"
                            onClick={() => {}}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                          >
                            Add records
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        )}
                      </div>
                    ) : list?.type === 'properties' ? (
                      /* ─── PROPERTIES TABLE (1:1 reference classes) ─── */
                      <table className="w-full text-left text-sm text-slate-600" role="grid">
                        <thead className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-600 tracking-wider sticky top-0 backdrop-blur-sm z-10">
                          <tr>
                            <th className="pl-6 pr-4 py-3 w-12 font-semibold align-middle" scope="col">
                              <input
                                type="checkbox"
                                checked={listings.length > 0 && selectedIds.size === listings.length}
                                onChange={handleSelectAll}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                aria-label="Select all"
                              />
                            </th>
                            <th className="px-4 py-3 font-semibold align-middle w-[30%]" scope="col">Address</th>
                            <th className="px-4 py-3 font-semibold w-32 align-middle" scope="col">Price</th>
                            <th className="px-4 py-3 font-semibold w-24 align-middle" scope="col">Status</th>
                            <th className="px-4 py-3 font-semibold w-24 text-center align-middle" scope="col">AI Score</th>
                            <th className="px-4 py-3 font-semibold w-16 text-center align-middle" scope="col">Beds</th>
                            <th className="px-4 py-3 font-semibold w-16 text-center align-middle" scope="col">Baths</th>
                            <th className="px-4 py-3 font-semibold w-24 text-right align-middle" scope="col">Sqft</th>
                            <th className="px-4 py-3 font-semibold w-24 text-right align-middle" scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-600/50">
                          {listings.map((listing) => {
                            const id = getListingId(listing)
                            const address = listing.street || '—'
                            const cityStateZip = [listing.city, listing.state, listing.zip_code]
                              .filter(Boolean)
                              .join(', ')
                            const isDeleting = deletingId === id
                            const isSelected = selectedListing != null && getListingId(selectedListing) === id

                            return (
                              <tr
                                key={id}
                                onClick={() => handleRowClick(listing)}
                                className={`transition-colors duration-150 group cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50/60 hover:bg-blue-50 border-l-4 border-l-blue-500'
                                    : 'bg-white hover:bg-slate-50/80'
                                }`}
                              >
                                <td className={`${isSelected ? 'pl-5' : 'pl-6'} pr-4 py-2.5 align-middle`}>
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(id)}
                                    onChange={(e) => handleSelect(id, e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Select property ${address}`}
                                  />
                                </td>
                                <td className="px-4 py-2.5 align-middle">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      isSelected ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-500'
                                    }`}>
                                      <span className="material-symbols-outlined text-[18px]">
                                        {isSelected ? 'home' : 'location_on'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                      <span className={`font-semibold text-sm ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                                        {address}
                                      </span>
                                      <span className={`text-[11px] ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>
                                        {cityStateZip || '—'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className={`px-4 py-2.5 align-middle text-sm font-bold font-mono ${isSelected ? 'text-slate-800' : 'text-slate-700'}`}>
                                  {listing.list_price != null
                                    ? `$${Number(listing.list_price).toLocaleString()}`
                                    : '—'}
                                </td>
                                <td className="px-4 py-2.5 align-middle">
                                  <StatusBadge status={listing.status} />
                                </td>
                                <td className="px-4 py-2.5 text-center align-middle">
                                  <AIScoreCell score={listing.ai_investment_score} />
                                </td>
                                <td className={`px-4 py-2.5 text-center align-middle text-sm font-medium ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                                  {listing.beds ?? '—'}
                                </td>
                                <td className={`px-4 py-2.5 text-center align-middle text-sm font-medium ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                                  {listing.full_baths ?? '—'}
                                </td>
                                <td className={`px-4 py-2.5 text-right align-middle text-sm font-medium tabular-nums ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                                  {listing.sqft != null ? Number(listing.sqft).toLocaleString() : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right align-middle">
                                  <div className={`flex items-center justify-end gap-1 transition-opacity duration-200 ${
                                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                  }`}>
                                    <button
                                      type="button"
                                      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                                        isSelected
                                          ? 'text-blue-600 bg-blue-50'
                                          : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                      }`}
                                      title="Edit"
                                      aria-label="Edit"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">edit</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      /* ─── PEOPLE TABLE ─── */
                      <table className="w-full text-left text-sm text-slate-600" role="grid">
                        <thead className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-600 tracking-wider sticky top-0 backdrop-blur-sm z-10">
                          <tr>
                            <th className="pl-6 pr-4 py-3 w-12 font-semibold align-middle" scope="col">
                              <input
                                type="checkbox"
                                checked={listings.length > 0 && selectedIds.size === listings.length}
                                onChange={handleSelectAll}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                aria-label="Select all"
                              />
                            </th>
                            <th className="px-4 py-3 font-semibold align-middle w-[30%]" scope="col">Name</th>
                            <th className="px-4 py-3 font-semibold align-middle" scope="col">Job Title</th>
                            <th className="px-4 py-3 font-semibold align-middle" scope="col">Company</th>
                            <th className="px-4 py-3 font-semibold align-middle" scope="col">Email</th>
                            <th className="px-4 py-3 font-semibold align-middle" scope="col">Phone</th>
                            <th className="px-4 py-3 font-semibold w-24 text-right align-middle" scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-600/50">
                          {listings.map((item, idx) => {
                            const id =
                              (item as any).contact_id || item.listing_id || item.agent_email || `row-${idx}`
                            const name =
                              item.agent_name ||
                              [item.first_name, item.last_name].filter(Boolean).join(' ').trim() ||
                              '—'
                            const isDeleting = deletingId === id

                            return (
                              <tr
                                key={id}
                                className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group"
                              >
                                <td className="pl-6 pr-4 py-2.5 align-middle">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(id)}
                                    onChange={(e) => handleSelect(id, e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Select contact ${name}`}
                                  />
                                </td>
                                <td className="px-4 py-2.5 align-middle">
                                  <span className="font-semibold text-slate-800 text-sm">{name}</span>
                                </td>
                                <td className="px-4 py-2.5 align-middle text-sm text-slate-600">
                                  {item.job_title || '—'}
                                </td>
                                <td className="px-4 py-2.5 align-middle text-sm text-slate-600">
                                  {item.company || '—'}
                                </td>
                                <td className="px-4 py-2.5 align-middle text-sm text-slate-600 truncate max-w-[200px]">
                                  {item.agent_email || item.email || '—'}
                                </td>
                                <td className="px-4 py-2.5 align-middle text-sm text-slate-600">
                                  {item.agent_phone || item.phone || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right align-middle">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                      type="button"
                                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                      onClick={(e) => { e.stopPropagation(); handleRemoveFromList(item, e) }}
                                      disabled={isDeleting}
                                      aria-label="Delete"
                                      title="Delete"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* ─── PAGINATION FOOTER (matches lists index) ─── */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-600 px-4 py-2 flex items-center justify-between z-20">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Showing{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{startRecord}</span> -{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{endRecord}</span> of{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount.toLocaleString()}</span> records
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                        aria-label="Previous page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>
                      {totalPages >= 1 && (
                        <button
                          type="button"
                          onClick={() => setCurrentPage(1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                            currentPage === 1
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          1
                        </button>
                      )}
                      {totalPages >= 2 && (
                        <button
                          type="button"
                          onClick={() => setCurrentPage(2)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                            currentPage === 2
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          2
                        </button>
                      )}
                      {totalPages >= 3 && (
                        <button
                          type="button"
                          onClick={() => setCurrentPage(3)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                            currentPage === 3
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          3
                        </button>
                      )}
                      {totalPages > 4 && (
                        <span className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs">...</span>
                      )}
                      {totalPages > 4 && (
                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                            currentPage === totalPages
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {totalPages}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shadow-sm disabled:opacity-50"
                        aria-label="Next page"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── PROPERTY DETAIL SIDE PANEL (matches lists index styling) ─── */}
                {selectedListing && list?.type === 'properties' && (
                  <div className="w-[30%] min-w-[320px] bg-white dark:bg-slate-800/80 backdrop-blur-2xl border border-gray-200/80 dark:border-slate-600 shadow-float rounded-xl flex flex-col h-full overflow-hidden transition-all">
                    {/* Image header */}
                    <div className="relative h-48 shrink-0 group">
                      {selectedListing.primary_photo ? (
                        <img
                          alt={selectedListing.street || 'Property'}
                          className="w-full h-full object-cover"
                          src={selectedListing.primary_photo}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-400 text-[48px]">home</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <button
                          type="button"
                          onClick={() => setSelectedListing(null)}
                          className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white flex items-center justify-center transition-all"
                          aria-label="Close panel"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <h2 className="text-xl font-bold leading-tight mb-0.5">
                          {selectedListing.street || 'Address N/A'}
                        </h2>
                        <p className="text-white/80 text-xs font-medium">
                          {[selectedListing.city, selectedListing.state, selectedListing.zip_code].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5">
                      {/* Price + status */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">List Price</span>
                            <span className="text-2xl font-bold text-slate-900 tracking-tight">
                              {selectedListing.list_price != null
                                ? `$${Number(selectedListing.list_price).toLocaleString()}`
                                : '—'}
                            </span>
                          </div>
                          <StatusBadge status={selectedListing.status || 'Active'} />
                        </div>
                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50 rounded-lg p-2.5 flex flex-col items-center justify-center border border-slate-100 text-center hover:bg-blue-50 hover:border-blue-100 transition-colors group">
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 mb-1 text-[20px]">bed</span>
                            <span className="text-sm font-bold text-slate-800">{selectedListing.beds ?? '—'}</span>
                            <span className="text-[10px] text-slate-500 font-medium">Beds</span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5 flex flex-col items-center justify-center border border-slate-100 text-center hover:bg-blue-50 hover:border-blue-100 transition-colors group">
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 mb-1 text-[20px]">bathtub</span>
                            <span className="text-sm font-bold text-slate-800">{selectedListing.full_baths ?? '—'}</span>
                            <span className="text-[10px] text-slate-500 font-medium">Baths</span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2.5 flex flex-col items-center justify-center border border-slate-100 text-center hover:bg-blue-50 hover:border-blue-100 transition-colors group">
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 mb-1 text-[20px]">square_foot</span>
                            <span className="text-sm font-bold text-slate-800">
                              {selectedListing.sqft != null ? Number(selectedListing.sqft).toLocaleString() : '—'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">Sqft</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-px bg-slate-100" />
                      {/* AI Insights */}
                      {selectedListing.ai_investment_score != null && selectedListing.ai_investment_score > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-violet-600 text-[18px]">auto_awesome</span>
                            <h3 className="text-sm font-bold text-slate-800">Property Insights</h3>
                          </div>
                          <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 rounded-xl p-3 border border-violet-100/60 relative overflow-hidden">
                            <p className="text-xs text-slate-600 leading-relaxed relative z-10">
                              <span className="font-semibold text-slate-800">AI Score: {Math.round(selectedListing.ai_investment_score)}</span> — This property shows strong investment potential based on market analysis and comparable sales.
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Details */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-800">Details</h3>
                        {selectedListing.year_built && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-500">Year Built</span>
                            <span className="text-xs font-medium text-slate-700">{selectedListing.year_built}</span>
                          </div>
                        )}
                        {selectedListing.property_type && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-500">Type</span>
                            <span className="text-xs font-medium text-slate-700">{selectedListing.property_type}</span>
                          </div>
                        )}
                        {selectedListing.lot_size && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-500">Lot Size</span>
                            <span className="text-xs font-medium text-slate-700">{selectedListing.lot_size}</span>
                          </div>
                        )}
                        {selectedListing.agent_name && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-500">Agent</span>
                            <span className="text-xs font-medium text-slate-700">{selectedListing.agent_name}</span>
                          </div>
                        )}
                        {(selectedListing.agent_email || selectedListing.email) && (
                          <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-500">Contact</span>
                            <span className="text-xs font-medium text-slate-700">{selectedListing.agent_email || selectedListing.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Footer CTA */}
                    <div className="p-4 bg-white/50 backdrop-blur border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedListing.property_url) {
                            window.open(selectedListing.property_url, '_blank')
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 rounded-lg text-xs font-bold shadow-[0_2px_5px_rgba(59,130,246,0.3)] hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
                      >
                        View Full Profile
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </main>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}

export default function ListDetailPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <ListDetailContent />
    </DashboardLayout>
  )
}
