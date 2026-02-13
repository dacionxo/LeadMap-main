'use client'

import { useCallback, useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import DealsNavbar from './components/DealsNavbar'
import DealDetailView from './components/DealDetailView'
import EditDealModal from './components/EditDealModal'
import DealsSelectionActionBar from './components/DealsSelectionActionBar'
import DealsKanban from './components/DealsKanban'
import LeadDetailModal from '../../prospect-enrich/components/LeadDetailModal'

type DealRow = {
  id: string
  title: string
  value?: number | null
  stage: string
  expected_close_date?: string | null
  property_address?: string | null
  pipeline?: { id?: string; name?: string } | null
  pipeline_id?: string | null
  owner?: { id?: string; email?: string; name?: string } | null
  owner_id?: string | null
  forecast_value?: number | null
  last_interaction?: string | null
  close_probability?: number | null
  property_value?: number | null
}

/** Must be inside DashboardLayout. */
function DealsPageContent() {
  const [totalDeals, setTotalDeals] = useState<number | null>(null)
  const [deals, setDeals] = useState<DealRow[]>([])
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set())
  const [editingDeal, setEditingDeal] = useState<DealRow | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [dealForDetailView, setDealForDetailView] = useState<DealRow | null>(null)
  const [pipelines, setPipelines] = useState<Array<{ id: string; name: string; stages: string[]; is_default?: boolean }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [propertyModalListingId, setPropertyModalListingId] = useState<string | null>(null)
  const [propertyModalListingList, setPropertyModalListingList] = useState<any[]>([])
  const [propertyModalLoading, setPropertyModalLoading] = useState(false)

  const refreshDeals = async () => {
    try {
      const res = await fetch('/api/crm/deals?page=1&pageSize=50&sortBy=created_at&sortOrder=desc', { credentials: 'include' })
      const json = await res.json()
      if (res.ok) {
        setTotalDeals(json.pagination?.total ?? 0)
        setDeals(Array.isArray(json.data) ? json.data : [])
      } else {
        setTotalDeals(0)
        setDeals([])
      }
    } catch {
      setTotalDeals(0)
      setDeals([])
    }
  }

  useEffect(() => {
    refreshDeals()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [pipeRes, usersRes] = await Promise.all([
          fetch('/api/crm/deals/pipelines', { credentials: 'include' }),
          fetch('/api/crm/deals/users', { credentials: 'include' }),
        ])
        if (cancelled) return
        const pipeJson = await pipeRes.json()
        const usersJson = await usersRes.json()
        if (pipeRes.ok && pipeJson.data) setPipelines(Array.isArray(pipeJson.data) ? pipeJson.data : [])
        if (usersRes.ok && usersJson.data) setUsers(Array.isArray(usersJson.data) ? usersJson.data : [])
      } catch (e) {
        if (!cancelled) console.error('Error fetching pipelines/users:', e)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const displayTotal = totalDeals !== null ? totalDeals : '—'

  const handleAddressClick = useCallback(async (deal: DealRow & { listing_id?: string | null }) => {
    const listingId = deal.listing_id
    if (!listingId) return
    setPropertyModalLoading(true)
    try {
      const res = await fetch(`/api/crm/deals/listing?listingId=${encodeURIComponent(listingId)}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (res.ok && json.data) {
        setPropertyModalListingId(listingId)
        setPropertyModalListingList([json.data])
      }
    } catch {
      // no-op: modal not opened
    } finally {
      setPropertyModalLoading(false)
    }
  }, [])

  const closePropertyModal = useCallback(() => {
    setPropertyModalListingId(null)
    setPropertyModalListingList([])
  }, [])

  return (
    <div className="-mt-[30px] h-full flex flex-col min-h-0">
      <div className="flex-1 flex flex-col bg-mesh dark:bg-dark overflow-hidden min-h-0">
        <DealsNavbar />
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
          <div className="bg-white/80 dark:bg-dark/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] rounded-[2rem] flex flex-col h-full min-h-0 overflow-hidden relative">
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
              aria-hidden
            />

            <header className="shrink-0 z-20 px-8 py-6">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Deals <span className="text-blue-500">Pipeline</span>
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-base">
                    Manage your active opportunities and track progress.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 mr-4 text-sm text-gray-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live Updates
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDeal(null)
                      setIsEditModalOpen(true)
                    }}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                  >
                    Add New Deal
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">layers</span>
                    All Pipelines
                    <span className="material-symbols-outlined text-[18px] text-gray-300 dark:text-slate-500">expand_more</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">grid_view</span>
                    All Deals
                    <span className="material-symbols-outlined text-[18px] text-gray-300 dark:text-slate-500">expand_more</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                  >
                    Sort: Date Created
                    <span className="material-symbols-outlined text-[18px] text-gray-300 dark:text-slate-500">expand_more</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-gray-50/50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700">
                    Total: <span className="text-gray-900 dark:text-white font-bold">{displayTotal} deals</span>
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-slate-400">filter_list</span>
                    Filter
                  </button>
                </div>
              </div>
            </header>

            <DealsKanban
              deals={deals as any}
              stages={['Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']}
              onDealClick={(d) => {
                setEditingDeal(d)
                setIsEditModalOpen(true)
              }}
              onDealDetailView={(d) => {
                setDealForDetailView(d)
              }}
              onAddressClick={handleAddressClick}
              onDealUpdate={async (dealId, updates) => {
                const prev = deals
                if (updates.stage != null) {
                  setDeals((d) => d.map((x) => (x.id === dealId ? { ...x, stage: updates.stage! } : x)))
                }
                try {
                  const res = await fetch(`/api/crm/deals/${dealId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(updates),
                  })
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || 'Failed to update deal')
                  }
                  await refreshDeals()
                } catch (e) {
                  console.error('Error updating deal:', e)
                  setDeals(prev)
                  throw e
                }
              }}
              onDealDelete={async (dealId) => {
                const prev = deals
                setDeals((d) => d.filter((x) => x.id !== dealId))
                setTotalDeals((t) => (t != null ? Math.max(0, t - 1) : 0))
                try {
                  const res = await fetch(`/api/crm/deals/${dealId}`, { method: 'DELETE', credentials: 'include' })
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || 'Failed to delete deal')
                  }
                  await refreshDeals()
                } catch (e) {
                  console.error('Error deleting deal:', e)
                  setDeals(prev)
                  await refreshDeals()
                  throw e
                }
              }}
              pipelines={pipelines}
              onAddDeal={() => {
                setEditingDeal(null)
                setIsEditModalOpen(true)
              }}
            />
          </div>
        </div>
      </div>

      {propertyModalListingId && propertyModalListingList.length > 0 && (
        <LeadDetailModal
          listingId={propertyModalListingId}
          listingList={propertyModalListingList}
          onClose={closePropertyModal}
        />
      )}

      {dealForDetailView && (
        <DealDetailView
          deal={dealForDetailView as any}
          onClose={() => setDealForDetailView(null)}
          onUpdate={async (dealId, updates) => {
            try {
              const res = await fetch(`/api/crm/deals/${dealId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates),
              })
              if (res.ok) {
                await refreshDeals()
                const updated = await fetch(`/api/crm/deals/${dealId}`, { credentials: 'include' }).then((r) => r.json())
                if (updated?.data) setDealForDetailView(updated.data)
              } else {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Failed to update deal')
              }
            } catch (e) {
              console.error('Error updating deal:', e)
              throw e
            }
          }}
          onAddActivity={async (dealId, activity) => {
            const res = await fetch(`/api/crm/deals/${dealId}/activities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(activity),
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error || 'Failed to add activity')
            }
            if (dealForDetailView?.id === dealId) {
              const fullRes = await fetch(`/api/crm/deals/${dealId}`, { credentials: 'include' })
              const fullJson = await fullRes.json()
              if (fullRes.ok && fullJson?.data) setDealForDetailView(fullJson.data)
            }
          }}
          onAddTask={async () => {
            // Tasks API not implemented; no-op for now
          }}
        />
      )}

      <EditDealModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingDeal(null)
        }}
        onSave={async (payload) => {
          try {
            const isCreate = !editingDeal
            const url = isCreate ? '/api/crm/deals' : `/api/crm/deals/${editingDeal!.id}`
            const method = isCreate ? 'POST' : 'PUT'
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                title: payload.title,
                value: payload.value ?? null,
                stage: payload.stage ?? 'new',
                probability: payload.probability ?? 0,
                expected_close_date: payload.expected_close_date ?? null,
                pipeline_id: payload.pipeline_id ?? null,
                owner_id: payload.owner_id ?? null,
                notes: payload.notes ?? null,
              }),
            })
            if (res.ok) {
              await refreshDeals()
              setIsEditModalOpen(false)
              setEditingDeal(null)
            } else {
              const err = await res.json().catch(() => ({}))
              alert(err.error || (isCreate ? 'Failed to create deal' : 'Failed to update deal'))
            }
          } catch (e) {
            console.error('Error saving deal:', e)
            alert('Failed to save deal')
          }
        }}
        deal={editingDeal}
        pipelines={pipelines}
        users={users}
      />

      <DealsSelectionActionBar
        selectedCount={selectedDeals.size}
        onClose={() => setSelectedDeals(new Set())}
        onAddToSequence={() => {}}
        onDuplicate={() => {}}
        onExport={() => {}}
        onArchive={() => {}}
        onDelete={() => {}}
        onConvert={() => {}}
        onMoveTo={() => {}}
        onSidekick={() => {}}
        onApps={() => {}}
      />
    </div>
  )
}

export default function DealsPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <DealsPageContent />
    </DashboardLayout>
  )
}
