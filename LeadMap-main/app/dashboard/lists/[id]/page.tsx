'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
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

function AIScoreCell({ score }: { score?: number | null }) {
  if (score == null || score === 0) {
    return <span className="text-slate-300 text-sm">-</span>
  }
  const rounded = Math.round(score)
  if (rounded >= 90) {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto">
        <span className="text-[9px] font-bold text-white">{rounded}</span>
      </div>
    )
  }
  const deg = (rounded / 100) * 360
  return (
    <div
      className="w-6 h-6 p-[2px] rounded-full inline-flex"
      style={{
        background: `conic-gradient(from 180deg, #6366f1 0deg, #a855f7 ${deg}deg, #e2e8f0 ${deg}deg)`,
      }}
    >
      <div className="ai-score-inner flex-1 min-w-0 min-h-0 rounded-full flex items-center justify-center text-[9px] font-bold text-indigo-600">
        {rounded}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null
  const s = String(status).toLowerCase()
  const isPending = s.includes('pending')
  return (
    <span
      className={`inline-flex items-center px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wide leading-tight border ${
        isPending
          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      }`}
    >
      {status}
    </span>
  )
}

export default function ListDetailPage() {
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
        'Listing ID',
        'Address',
        'City',
        'State',
        'Zip Code',
        'Price',
        'Beds',
        'Baths',
        'Sqft',
        'Status',
        'Agent Name',
        'Agent Email',
        'Agent Phone',
      ]
      const csvRows = rows.map((r: Listing) => [
        r.listing_id || '',
        r.street || '',
        r.city || '',
        r.state || '',
        r.zip_code || '',
        r.list_price?.toString() || '',
        r.beds?.toString() || '',
        r.full_baths?.toString() || '',
        r.sqft?.toString() || '',
        r.status || '',
        r.agent_name || '',
        r.agent_email || '',
        r.agent_phone || '',
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

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endRecord = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount)

  if (!listId) {
    return null
  }

  if (loading && !list) {
    return (
      <DashboardLayout fullBleed>
        <div className="flex items-center justify-center h-full bg-mesh">
          <span className="text-slate-500 text-sm font-medium">Loading list...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout fullBleed>
      <div className="list-detail-page flex flex-col h-full min-h-0 bg-mesh font-sans text-slate-900 antialiased overflow-hidden">
        <div className="flex-1 px-3 pb-3 overflow-hidden flex flex-col min-h-0">
          <div className="list-detail-glass bg-white/40 backdrop-blur-2xl border border-white/60 shadow-glass rounded-xl flex flex-col h-full overflow-hidden relative flex-1 min-h-0">
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/4 -translate-y-1/4 mix-blend-multiply"
              aria-hidden
            />

            <header className="shrink-0 z-20 px-4 pt-4 pb-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Link
                    href="/dashboard/lists"
                    className="hover:text-blue-600 transition-colors"
                  >
                    Lists
                  </Link>
                  <span className="material-symbols-outlined text-[10px] text-slate-400">
                    chevron_right
                  </span>
                  <span className="text-slate-800">{list?.name ?? '…'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                      {list?.name ?? '…'}
                    </h1>
                    <span className="px-1.5 py-px rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold border border-slate-200 uppercase tracking-wide">
                      {totalCount} records
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {}}
                      className="h-7 px-2.5 rounded bg-white/60 border border-white shadow-sm-soft text-slate-600 text-[11px] font-semibold hover:bg-white hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-1 backdrop-blur-sm"
                      aria-label="Import"
                    >
                      <span className="material-symbols-outlined text-[14px]">upload_file</span>
                      Import
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="h-7 px-2.5 rounded bg-white/60 border border-white shadow-sm-soft text-slate-600 text-[11px] font-semibold hover:bg-white hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-1 backdrop-blur-sm"
                      aria-label="Export"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-2.5 rounded text-[11px] font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-1"
                      aria-label="Add records"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add records
                    </button>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white h-7 px-2.5 rounded text-[11px] font-bold shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 transition-all flex items-center gap-1"
                      aria-label="Research with AI"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      Research with AI
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded bg-white/60 border border-white shadow-sm-soft text-slate-500 hover:text-slate-800 hover:bg-white transition-all"
                      aria-label="More options"
                    >
                      <span className="material-symbols-outlined text-[14px]">more_vert</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-auto custom-scrollbar px-4 pb-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-3 mb-2 bg-white/50 backdrop-blur-md px-1.5 py-1 rounded-lg border border-white/50 shadow-sm-soft">
                <div className="flex-1 flex items-center relative group max-w-xs">
                  <span
                    className="absolute left-2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-600 transition-colors z-10 text-[16px]"
                    aria-hidden
                  >
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      list?.type === 'properties'
                        ? 'Search properties...'
                        : 'Search contacts...'
                    }
                    className="w-full pl-8 pr-3 py-0.5 bg-transparent border-0 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 h-7"
                    aria-label="Search"
                  />
                </div>
                <div className="h-4 w-px bg-slate-200 mx-1" aria-hidden />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-0.5 h-6 bg-white border border-slate-100 shadow-sm rounded text-[10px] font-medium text-slate-600 hover:border-slate-300 transition-colors"
                  >
                    Status: Any
                    <span className="material-symbols-outlined text-[12px] text-slate-400">
                      expand_more
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-0.5 h-6 bg-white border border-slate-100 shadow-sm rounded text-[10px] font-medium text-slate-600 hover:border-slate-300 transition-colors"
                  >
                    Price Range
                    <span className="material-symbols-outlined text-[12px] text-slate-400">
                      expand_more
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-0.5 h-6 bg-white border border-slate-100 shadow-sm rounded text-[10px] font-medium text-slate-600 hover:border-slate-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[12px] text-slate-500">
                      filter_list
                    </span>
                    More Filters
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col relative min-h-0">
                <div className="overflow-auto custom-scrollbar flex-1 pb-10 min-h-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <span className="text-slate-500 text-sm font-medium">
                        Loading...
                      </span>
                    </div>
                  ) : listings.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <span className="text-slate-500 text-sm font-medium">
                        {searchQuery ? 'No items match your search' : 'No items in this list'}
                      </span>
                    </div>
                  ) : list?.type === 'properties' ? (
                    <table
                      className="w-full text-left text-sm text-slate-600 table-fixed table-compact"
                      role="grid"
                    >
                      <thead className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-50/90 border-b border-slate-200/60 tracking-wider sticky top-0 backdrop-blur-md z-10">
                        <tr>
                          <th
                            className="pl-3 pr-1 py-1.5 w-8 font-semibold align-middle"
                            scope="col"
                          >
                            <input
                              type="checkbox"
                              checked={
                                listings.length > 0 &&
                                selectedIds.size === listings.length
                              }
                              onChange={handleSelectAll}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3 h-3 cursor-pointer"
                              aria-label="Select all"
                            />
                          </th>
                          <th
                            className="px-2 py-1.5 font-semibold align-middle w-[35%]"
                            scope="col"
                          >
                            Address
                          </th>
                          <th
                            className="px-2 py-1.5 font-semibold w-24 align-middle"
                            scope="col"
                          >
                            Price
                          </th>
                          <th
                            className="px-2 py-1.5 font-semibold w-20 align-middle"
                            scope="col"
                          >
                            Status
                          </th>
                          <th
                            className="px-2 py-1.5 font-semibold w-20 text-center align-middle"
                            scope="col"
                          >
                            AI Score
                          </th>
                          <th
                            className="px-1 py-1.5 font-semibold w-12 text-center align-middle"
                            scope="col"
                          >
                            Beds
                          </th>
                          <th
                            className="px-1 py-1.5 font-semibold w-12 text-center align-middle"
                            scope="col"
                          >
                            Baths
                          </th>
                          <th
                            className="px-2 py-1.5 font-semibold w-20 text-right align-middle"
                            scope="col"
                          >
                            Sqft
                          </th>
                          <th
                            className="px-2 py-1.5 font-semibold w-16 text-right align-middle"
                            scope="col"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[13px]">
                        {listings.map((listing) => {
                          const id =
                            listing.listing_id || listing.property_url || ''
                          const address = listing.street || '—'
                          const cityStateZip = [listing.city, listing.state, listing.zip_code]
                            .filter(Boolean)
                            .join(', ')
                          const isDeleting = deletingId === id

                          return (
                            <tr
                              key={id}
                              className="bg-white/40 hover:bg-blue-50/40 transition-colors duration-150 group"
                            >
                              <td className="pl-3 pr-1 align-middle">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(id)}
                                  onChange={(e) =>
                                    handleSelect(id, e.target.checked)
                                  }
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3 h-3 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-2 align-middle">
                                <div className="flex items-center gap-2">
                                  <div className="p-0.5 rounded-full bg-slate-100 shrink-0">
                                    <span className="material-symbols-outlined text-slate-400 text-[12px]">
                                      location_on
                                    </span>
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 leading-none mb-0.5">
                                      <span className="font-semibold text-slate-800 text-xs truncate">
                                        {address}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 leading-none">
                                      <span className="text-[10px] text-slate-500 truncate">
                                        {cityStateZip || '—'}
                                      </span>
                                      {listing.property_url && (
                                        <a
                                          href={listing.property_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[9px] font-medium text-blue-600 hover:underline inline-flex items-center gap-px opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <span className="material-symbols-outlined text-[9px]">
                                            open_in_new
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 align-middle text-xs font-semibold text-slate-700">
                                {listing.list_price != null
                                  ? `$${Number(listing.list_price).toLocaleString()}`
                                  : '—'}
                              </td>
                              <td className="px-2 align-middle">
                                <StatusBadge status={listing.status} />
                              </td>
                              <td className="px-2 text-center align-middle">
                                <AIScoreCell score={listing.ai_investment_score} />
                              </td>
                              <td className="px-1 text-center align-middle text-slate-600">
                                {listing.beds ?? '—'}
                              </td>
                              <td className="px-1 text-center align-middle text-slate-600">
                                {listing.full_baths ?? '—'}
                              </td>
                              <td className="px-2 text-right align-middle text-slate-600 tabular-nums">
                                {listing.sqft != null
                                  ? Number(listing.sqft).toLocaleString()
                                  : '—'}
                              </td>
                              <td className="px-2 text-right align-middle">
                                <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <button
                                    type="button"
                                    className="w-5 h-5 flex items-center justify-center hover:text-blue-600 hover:bg-blue-50/80 rounded transition-colors"
                                    title="Edit"
                                    aria-label="Edit"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="material-symbols-outlined text-[12px]">
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleRemoveFromList(listing, e)
                                    }
                                    disabled={isDeleting}
                                    className="w-5 h-5 flex items-center justify-center hover:text-red-600 hover:bg-red-50/80 rounded transition-colors disabled:opacity-50"
                                    aria-label="Delete"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table
                      className="w-full text-left text-sm text-slate-600 table-fixed table-compact"
                      role="grid"
                    >
                      <thead className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-50/90 border-b border-slate-200/60 tracking-wider sticky top-0 backdrop-blur-md z-10">
                        <tr>
                          <th className="pl-3 pr-1 py-1.5 w-8 font-semibold align-middle" scope="col">
                            <input
                              type="checkbox"
                              checked={
                                listings.length > 0 &&
                                selectedIds.size === listings.length
                              }
                              onChange={handleSelectAll}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3 h-3 cursor-pointer"
                              aria-label="Select all"
                            />
                          </th>
                          <th className="px-2 py-1.5 font-semibold align-middle w-[30%]" scope="col">
                            Name
                          </th>
                          <th className="px-2 py-1.5 font-semibold align-middle" scope="col">
                            Job Title
                          </th>
                          <th className="px-2 py-1.5 font-semibold align-middle" scope="col">
                            Company
                          </th>
                          <th className="px-2 py-1.5 font-semibold align-middle" scope="col">
                            Email
                          </th>
                          <th className="px-2 py-1.5 font-semibold align-middle" scope="col">
                            Phone
                          </th>
                          <th className="px-2 py-1.5 font-semibold w-16 text-right align-middle" scope="col">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 text-[13px]">
                        {listings.map((item, idx) => {
                          const id =
                            (item as any).contact_id ||
                            item.listing_id ||
                            item.agent_email ||
                            `row-${idx}`
                          const name =
                            item.agent_name ||
                            [item.first_name, item.last_name]
                              .filter(Boolean)
                              .join(' ')
                              .trim() ||
                            '—'
                          const isDeleting = deletingId === id

                          return (
                            <tr
                              key={id}
                              className="bg-white/40 hover:bg-blue-50/40 transition-colors duration-150 group"
                            >
                              <td className="pl-3 pr-1 align-middle">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(id)}
                                  onChange={(e) =>
                                    handleSelect(id, e.target.checked)
                                  }
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3 h-3 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-2 align-middle">
                                <span className="font-semibold text-slate-800 text-xs">
                                  {name}
                                </span>
                              </td>
                              <td className="px-2 align-middle text-slate-600 text-xs">
                                {item.job_title || '—'}
                              </td>
                              <td className="px-2 align-middle text-slate-600 text-xs">
                                {item.company || '—'}
                              </td>
                              <td className="px-2 align-middle text-slate-600 text-xs truncate max-w-[180px]">
                                {item.agent_email || item.email || '—'}
                              </td>
                              <td className="px-2 align-middle text-slate-600 text-xs">
                                {item.agent_phone || item.phone || '—'}
                              </td>
                              <td className="px-2 text-right align-middle">
                                <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <button
                                    type="button"
                                    className="w-5 h-5 flex items-center justify-center hover:text-red-600 hover:bg-red-50/80 rounded transition-colors disabled:opacity-50"
                                    onClick={(e) =>
                                      handleRemoveFromList(item, e)
                                    }
                                    disabled={isDeleting}
                                    aria-label="Delete"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">
                                      delete
                                    </span>
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

                <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 px-4 py-2 flex items-center justify-between z-20">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Showing{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{startRecord}</span>{' '}
                    -{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{endRecord}</span>{' '}
                    of <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount}</span>{' '}
                    records
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      aria-label="Previous page"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        chevron_left
                      </span>
                    </button>
                    {(() => {
                      const pages: (number | 'ellipsis')[] = []
                      if (totalPages <= 5) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i)
                      } else if (currentPage <= 3) {
                        pages.push(1, 2, 3, 'ellipsis', totalPages)
                      } else if (currentPage >= totalPages - 2) {
                        pages.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages)
                      } else {
                        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages)
                      }
                      return pages.map((p, i) =>
                        p === 'ellipsis' ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                              currentPage === p
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'border border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )
                    })()}
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                      aria-label="Next page"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
