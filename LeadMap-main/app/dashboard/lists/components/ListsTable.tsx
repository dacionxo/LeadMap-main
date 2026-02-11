'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'

interface List {
  id: string
  name: string
  type?: 'people' | 'properties'
  item_count?: number
  created_at?: string
  updated_at?: string
  user_id?: string
}

interface ListsTableProps {
  lists: List[]
  onRefresh: () => void
}

export default function ListsTable({ lists, onRefresh }: ListsTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [allSelected, setAllSelected] = useState(false)

  const handleDelete = async (listId: string, listName: string) => {
    if (!confirm(`Are you sure you want to delete "${listName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingId(listId)
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.ok) {
        onRefresh()
      } else {
        alert(data.error || 'Failed to delete list')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete list')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleExportCSV = async (listId: string, listName: string, list: List) => {
    try {
      const response = await fetch(
        `/api/lists/${listId}/paginated?page=1&pageSize=1000`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        alert('Failed to fetch list items for export')
        return
      }

      const data = await response.json()
      const items = data.data || []

      if (items.length === 0) {
        alert('No items to export')
        return
      }

      const isPropertiesList = list.type === 'properties'

      let headers: string[]
      let rows: string[][]

      if (isPropertiesList) {
        headers = [
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
          'Score',
          'Year Built',
          'Last Sale Price',
          'Last Sale Date',
          'Property URL',
        ]
        rows = items.map((item: Record<string, unknown>) => [
          String(item.listing_id || ''),
          String(item.street || ''),
          String(item.city || ''),
          String(item.state || ''),
          String(item.zip_code || ''),
          String(item.list_price ?? ''),
          String(item.beds ?? ''),
          String(item.full_baths ?? ''),
          String(item.sqft ?? ''),
          String(item.status || ''),
          String(item.agent_name || ''),
          String(item.agent_email || ''),
          String(item.agent_phone || ''),
          String(item.ai_investment_score ?? ''),
          String(item.year_built ?? ''),
          String(item.last_sale_price ?? ''),
          String(item.last_sale_date || ''),
          String(item.property_url || ''),
        ])
      } else {
        headers = [
          'Name',
          'Email',
          'Phone',
          'Company',
          'Job Title',
          'Address',
          'City',
          'State',
          'Zip Code',
          'Source',
        ]
        rows = items.map((item: Record<string, unknown>) => [
          `${item.first_name || ''} ${item.last_name || ''}`.trim() ||
            String(item.agent_name || ''),
          String(item.email || item.agent_email || ''),
          String(item.phone || item.agent_phone || ''),
          String(item.company || ''),
          String(item.job_title || ''),
          String(item.address || item.street || ''),
          String(item.city || ''),
          String(item.state || ''),
          String(item.zip_code || ''),
          String(item.source || ''),
        ])
      }

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${listName.replace(/[^a-z0-9]/gi, '_')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting CSV:', err)
      alert('Failed to export list')
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      setAllSelected(false)
    } else {
      setSelectedIds(new Set(lists.map((l) => l.id)))
      setAllSelected(true)
    }
  }

  if (lists.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-md border border-white rounded-xl shadow-sm-soft overflow-hidden flex-1 flex flex-col">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white/30 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-700">All Lists</h2>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200">
              0
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-16">
          <p className="text-slate-500 text-sm font-medium">No lists match your criteria</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/70 backdrop-blur-md border border-white rounded-xl shadow-sm-soft overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white/30 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-700">All Lists</h2>
          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200">
            {lists.length}
          </span>
        </div>
        <button
          type="button"
          className="text-blue-600 text-xs font-semibold hover:underline"
          onClick={() => router.push('/dashboard/lists')}
          aria-label="View all lists"
        >
          View All
        </button>
      </div>

      <div className="overflow-auto custom-scrollbar flex-1 min-h-0">
        <table className="w-full text-left text-sm text-slate-600" role="grid">
          <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100 tracking-wider sticky top-0 backdrop-blur-sm z-10">
            <tr>
              <th className="px-5 py-3 w-10 font-semibold" scope="col">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all lists"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3.5 h-3.5 cursor-pointer transition-colors"
                />
              </th>
              <th className="px-4 py-3 font-semibold" scope="col">
                List Name
              </th>
              <th className="px-4 py-3 text-center font-semibold w-24" scope="col">
                Records
              </th>
              <th className="px-4 py-3 font-semibold" scope="col">
                Type
              </th>
              <th className="px-4 py-3 font-semibold" scope="col">
                Owner
              </th>
              <th className="px-4 py-3 font-semibold" scope="col">
                Modified
              </th>
              <th className="px-5 py-3 text-right font-semibold" scope="col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {lists.map((list) => {
              const listType = list.type || 'properties'
              const isDeleting = deletingId === list.id
              const initials = 'Y'

              return (
                <tr
                  key={list.id}
                  className="bg-white/40 hover:bg-blue-50/40 transition-colors duration-150 group cursor-pointer"
                  onClick={() => router.push(`/dashboard/lists/${list.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/dashboard/lists/${list.id}`)
                    }
                  }}
                  tabIndex={0}
                  role="row"
                >
                  <td
                    className="px-5 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(list.id)}
                      onChange={() => handleToggleSelect(list.id)}
                      aria-label={`Select ${list.name}`}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 w-3.5 h-3.5 cursor-pointer transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 transition-colors text-[20px]"
                        aria-hidden
                      >
                        folder_open
                      </span>
                      <span className="font-semibold text-slate-700 text-sm cursor-pointer hover:text-blue-600 transition-colors">
                        {list.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="font-medium text-slate-500 text-xs">
                      {list.item_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600 shadow-sm">
                      <span
                        className="material-symbols-outlined text-[14px] text-blue-500"
                        aria-hidden
                      >
                        {listType === 'properties' ? 'apartment' : 'group'}
                      </span>
                      {listType === 'properties' ? 'Properties' : 'Prospects'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full bg-slate-200 text-[9px] flex items-center justify-center font-bold text-slate-600 ring-1 ring-white"
                        aria-hidden
                      >
                        {initials}
                      </div>
                      <span className="text-slate-500 text-xs">You</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {formatDate(list.updated_at || list.created_at)}
                  </td>
                  <td
                    className="px-5 py-2.5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExportCSV(list.id, list.name, list)
                        }}
                        className="w-7 h-7 flex items-center justify-center hover:text-blue-600 hover:bg-blue-50/80 rounded-md transition-colors"
                        title="Export"
                        aria-label={`Export ${list.name}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center hover:text-slate-800 hover:bg-slate-100/80 rounded-md transition-colors"
                            aria-label={`More actions for ${list.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              more_horiz
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="flex gap-2 items-center cursor-pointer text-red-600 focus:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(list.id, list.name)
                            }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
