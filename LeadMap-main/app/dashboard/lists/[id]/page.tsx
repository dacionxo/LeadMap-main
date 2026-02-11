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
    return <span className="text-slate-300 text-lg">-</span>
  }
  const rounded = Math.round(score)
  if (rounded >= 90) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-bold leading-none border border-emerald-100">
        {rounded}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600 text-[11px] font-bold leading-none border border-blue-100">
      {rounded}
    </span>
  )
}

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
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-glass rounded-xl flex flex-col h-full overflow-hidden relative flex-1 min-h-0">
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/4 -translate-y-1/4 mix-blend-multiply"
              aria-hidden
            />

            <header className="shrink-0 z-20 px-6 pt-6 pb-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                  <Link
                    href="/dashboard/lists"
                    className="hover:text-blue-600 transition-colors"
                  >
                    Lists
                  </Link>
                  <span className="material-symbols-outlined text-[12px] text-slate-400">
                    chevron_right
                  </span>
                  <span className="text-slate-800">{list?.name ?? '…'}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">
                        {list?.name ?? '…'} <span className="text-blue-600">List</span>
                      </h1>
                    </div>
                    <p className="text-slate-500 text-sm mt-1.5 font-normal">
                      Manage and track your property records in this list efficiently.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      type="button"
                      onClick={() => {}}
                      className="h-9 px-4 rounded-full bg-white border border-slate-200 hover:border-slate-300 shadow-sm text-slate-600 text-xs font-semibold hover:text-slate-800 transition-all flex items-center gap-2"
                      aria-label="Import"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload_file</span>
                      Import
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="h-9 px-4 rounded-full bg-white border border-slate-200 hover:border-slate-300 shadow-sm text-slate-600 text-xs font-semibold hover:text-slate-800 transition-all flex items-center gap-2"
                      aria-label="Export"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-5 rounded-full text-xs font-bold shadow-action-btn hover:shadow-blue-500/40 transition-all flex items-center gap-2"
                      aria-label="Add records"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add records
                    </button>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-9 px-5 rounded-full text-xs font-bold shadow-action-btn hover:shadow-violet-500/40 transition-all flex items-center gap-2"
                      aria-label="Research with AI"
                    >
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                      Research with AI
                    </button>
                    <button
                      type="button"
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 shadow-sm transition-all"
                      aria-label="More options"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-auto custom-scrollbar px-6 pb-6 flex flex-col mt-2 min-h-0">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative group w-full max-w-sm">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-600 transition-colors z-10 text-[20px]"
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
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm transition-all h-10"
                    aria-label="Search"
                  />
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 h-10 bg-white border border-slate-200 shadow-sm rounded-full text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">grid_view</span>
                    View
                    <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 h-10 bg-white border border-slate-200 shadow-sm rounded-full text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
                  >
                    Sort: Modified
                    <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 h-10 bg-white border border-slate-200 shadow-sm rounded-full text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-400">filter_list</span>
                    Filter
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col relative min-h-0">
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
                      className="w-full text-left text-sm text-slate-600"
                      role="grid"
                    >
                      <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100 tracking-wider sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                          <th
                            className="pl-6 pr-4 py-3 w-12 font-semibold align-middle"
                            scope="col"
                          >
                            <input
                              type="checkbox"
                              checked={
                                listings.length > 0 &&
                                selectedIds.size === listings.length
                              }
                              onChange={handleSelectAll}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                              aria-label="Select all"
                            />
                          </th>
                          <th
                            className="px-4 py-3 font-semibold align-middle w-[30%]"
                            scope="col"
                          >
                            Address
                          </th>
                          <th
                            className="px-4 py-3 font-semibold w-32 align-middle"
                            scope="col"
                          >
                            Price
                          </th>
                          <th
                            className="px-4 py-3 font-semibold w-24 align-middle"
                            scope="col"
                          >
                            Status
                          </th>
                          <th
                            className="px-4 py-3 font-semibold w-24 text-center align-middle"
                            scope="col"
                          >
                            AI Score
                          </th>
                          <th
                            className="px-4 py-3 font-semibold w-16 text-center align-middle"
                            scope="col"
                          >
                            Beds
                          </th>
                          <th
                            className="px-4 py-3 font-semibold w-16 text-center align-middle"
                            scope="col"
                          >
                            Baths
                          </th>
                          <th
                            className="px-4 py-3 font-semibold w-24 text-right align-middle"
                            scope="col"
                          >
                            Sqft
                          </th>
                          <th
                            className="px-4 py-3 font-semibold w-24 text-right align-middle"
                            scope="col"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
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
                              className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group"
                            >
                              <td className="pl-6 pr-4 py-2.5 align-middle">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(id)}
                                  onChange={(e) =>
                                    handleSelect(id, e.target.checked)
                                  }
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-4 py-2.5 align-middle">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                                  </div>
                                  <div className="flex flex-col justify-center">
                                    <span className="font-semibold text-slate-800 text-sm">{address}</span>
                                    <span className="text-[11px] text-slate-500">{cityStateZip || '—'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 align-middle text-sm font-bold text-slate-700 font-mono">
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
                              <td className="px-4 py-2.5 text-center align-middle text-sm font-medium text-slate-600">
                                {listing.beds ?? '—'}
                              </td>
                              <td className="px-4 py-2.5 text-center align-middle text-sm font-medium text-slate-600">
                                {listing.full_baths ?? '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right align-middle text-sm font-medium text-slate-600 tabular-nums">
                                {listing.sqft != null
                                  ? Number(listing.sqft).toLocaleString()
                                  : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right align-middle">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <button
                                    type="button"
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit"
                                    aria-label="Edit"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleRemoveFromList(listing, e)
                                    }
                                    disabled={isDeleting}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                    aria-label="Delete"
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
                  ) : (
                    <table
                      className="w-full text-left text-sm text-slate-600"
                      role="grid"
                    >
                      <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100 tracking-wider sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                          <th className="pl-6 pr-4 py-3 w-12 font-semibold align-middle" scope="col">
                            <input
                              type="checkbox"
                              checked={
                                listings.length > 0 &&
                                selectedIds.size === listings.length
                              }
                              onChange={handleSelectAll}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                              aria-label="Select all"
                            />
                          </th>
                          <th className="px-4 py-3 font-semibold align-middle w-[30%]" scope="col">
                            Name
                          </th>
                          <th className="px-4 py-3 font-semibold align-middle" scope="col">
                            Job Title
                          </th>
                          <th className="px-4 py-3 font-semibold align-middle" scope="col">
                            Company
                          </th>
                          <th className="px-4 py-3 font-semibold align-middle" scope="col">
                            Email
                          </th>
                          <th className="px-4 py-3 font-semibold align-middle" scope="col">
                            Phone
                          </th>
                          <th className="px-4 py-3 font-semibold w-24 text-right align-middle" scope="col">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
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
                              className="bg-white hover:bg-slate-50/80 transition-colors duration-150 group"
                            >
                              <td className="pl-6 pr-4 py-2.5 align-middle">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(id)}
                                  onChange={(e) =>
                                    handleSelect(id, e.target.checked)
                                  }
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-4 py-2.5 align-middle">
                                <span className="font-semibold text-slate-800 text-sm">
                                  {name}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 align-middle text-sm font-medium text-slate-600">
                                {item.job_title || '—'}
                              </td>
                              <td className="px-4 py-2.5 align-middle text-sm font-medium text-slate-600">
                                {item.company || '—'}
                              </td>
                              <td className="px-4 py-2.5 align-middle text-sm font-medium text-slate-600 truncate max-w-[180px]">
                                {item.agent_email || item.email || '—'}
                              </td>
                              <td className="px-4 py-2.5 align-middle text-sm font-medium text-slate-600">
                                {item.agent_phone || item.phone || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right align-middle">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <button
                                    type="button"
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                    onClick={(e) =>
                                      handleRemoveFromList(item, e)
                                    }
                                    disabled={isDeleting}
                                    aria-label="Delete"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
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

                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between z-20">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing{' '}
                    <span className="font-bold text-slate-800">{startRecord}</span>{' '}
                    -{' '}
                    <span className="font-bold text-slate-800">{endRecord}</span>{' '}
                    of <span className="font-bold text-slate-800">{totalCount}</span>{' '}
                    records
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
                            className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs"
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
                                : 'border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none"
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
