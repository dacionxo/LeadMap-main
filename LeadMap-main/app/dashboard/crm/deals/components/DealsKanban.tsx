'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'

interface Deal {
  id: string
  title: string
  value?: number | null
  stage: string
  probability?: number
  expected_close_date?: string | null
  created_at?: string
  description?: string | null
  notes?: string | null
  contact?: { id?: string; first_name?: string; last_name?: string; email?: string; phone?: string; company?: string } | null
  owner?: { id?: string; email?: string; name?: string } | null
  owner_id?: string | null
  pipeline_id?: string | null
  listing_id?: string | null
  property_address?: string | null
  property_value?: number | null
  forecast_value?: number | null
  last_interaction?: string | null
  updated_at?: string | null
  primary_photo?: string | null
}

interface DealsKanbanProps {
  deals: Deal[]
  stages: string[]
  onDealClick: (deal: Deal) => void
  onDealDetailView?: (deal: Deal) => void
  onAddressClick?: (deal: Deal) => void
  onDealUpdate: (dealId: string, updates: Partial<Deal>) => Promise<void>
  onDealDelete: (dealId: string) => Promise<void>
  pipelines?: Array<{ id: string; name: string; stages: string[] }>
  onAddDeal?: (stage?: string) => void
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=256&fit=crop'

function fmtCurrency(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '—'
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtShortDate(s: string | null | undefined): string {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysSince(s: string | null | undefined): number {
  if (!s) return 0
  const d = new Date(s)
  if (isNaN(d.getTime())) return 0
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

const STAGE_KEYS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as const

const STAGE_CONFIG: Record<string, {
  label: string
  icon: string
  headerBg: string
  headerBorder: string
  headerIcon: string
  headerCount: string
  addBtn: string
  addBtnHover: string
  dropZone: string
  dropZoneHover: string
}> = {
  new: {
    label: 'Lead',
    icon: 'adjust',
    headerBg: 'bg-blue-50/80',
    headerBorder: 'border-blue-100/50',
    headerIcon: 'bg-blue-100 text-blue-600',
    headerCount: 'text-blue-500',
    addBtn: 'hover:text-blue-600 hover:bg-blue-100',
    dropZone: 'hover:border-blue-300 hover:bg-blue-50/30',
    addBtnHover: 'group-hover:text-blue-400',
    dropZoneHover: 'group-hover:text-blue-500',
  },
  contacted: {
    label: 'Contacted',
    icon: 'chat',
    headerBg: 'bg-violet-50/80',
    headerBorder: 'border-violet-100/50',
    headerIcon: 'bg-violet-100 text-violet-600',
    headerCount: 'text-violet-500',
    addBtn: 'hover:text-violet-600 hover:bg-violet-100',
    dropZone: 'hover:border-violet-300 hover:bg-violet-50/30',
    addBtnHover: 'group-hover:text-violet-400',
    dropZoneHover: 'group-hover:text-violet-500',
  },
  qualified: {
    label: 'Qualified',
    icon: 'check_circle',
    headerBg: 'bg-indigo-50/80',
    headerBorder: 'border-indigo-100/50',
    headerIcon: 'bg-indigo-100 text-indigo-600',
    headerCount: 'text-indigo-500',
    addBtn: 'hover:text-indigo-600 hover:bg-indigo-100',
    dropZone: 'hover:border-indigo-300 hover:bg-indigo-50/30',
    addBtnHover: 'group-hover:text-indigo-400',
    dropZoneHover: 'group-hover:text-indigo-500',
  },
  proposal: {
    label: 'Proposal',
    icon: 'description',
    headerBg: 'bg-rose-50/80',
    headerBorder: 'border-rose-100/50',
    headerIcon: 'bg-rose-100 text-rose-600',
    headerCount: 'text-rose-500',
    addBtn: 'hover:text-rose-600 hover:bg-rose-100',
    dropZone: 'hover:border-rose-300 hover:bg-rose-50/30',
    addBtnHover: 'group-hover:text-rose-400',
    dropZoneHover: 'group-hover:text-rose-500',
  },
  negotiation: {
    label: 'Negotiation',
    icon: 'handshake',
    headerBg: 'bg-amber-50/80',
    headerBorder: 'border-amber-100/50',
    headerIcon: 'bg-amber-100 text-amber-600',
    headerCount: 'text-amber-500',
    addBtn: 'hover:text-amber-600 hover:bg-amber-100',
    dropZone: 'hover:border-amber-300 hover:bg-amber-50/30',
    addBtnHover: 'group-hover:text-amber-400',
    dropZoneHover: 'group-hover:text-amber-500',
  },
  closed_won: {
    label: 'Closed Won',
    icon: 'verified',
    headerBg: 'bg-emerald-50/80',
    headerBorder: 'border-emerald-100/50',
    headerIcon: 'bg-emerald-100 text-emerald-600',
    headerCount: 'text-emerald-500',
    addBtn: 'hover:text-emerald-600 hover:bg-emerald-100',
    dropZone: 'hover:border-emerald-300 hover:bg-emerald-50/30',
    addBtnHover: 'group-hover:text-emerald-400',
    dropZoneHover: 'group-hover:text-emerald-500',
  },
  closed_lost: {
    label: 'Closed Lost',
    icon: 'cancel',
    headerBg: 'bg-slate-50/80',
    headerBorder: 'border-slate-100/50',
    headerIcon: 'bg-slate-100 text-slate-600',
    headerCount: 'text-slate-500',
    addBtn: 'hover:text-slate-600 hover:bg-slate-100',
    dropZone: 'hover:border-slate-300 hover:bg-slate-50/30',
    addBtnHover: 'group-hover:text-slate-400',
    dropZoneHover: 'group-hover:text-slate-500',
  },
}

function normalizeStage(s: string): string {
  const t = s.toLowerCase().trim()
  const m: Record<string, string> = {
    lead: 'new', 'new lead': 'new', new: 'new',
    'sales qualified': 'contacted', contacted: 'contacted',
    'meeting booked': 'qualified', qualified: 'qualified',
    'contract sent': 'proposal', proposal: 'proposal',
    negotiation: 'negotiation',
    'closed won': 'closed_won', closed_won: 'closed_won',
    'closed lost': 'closed_lost', closed_lost: 'closed_lost',
  }
  return m[t] ?? t.replace(/\s+/g, '_')
}

function columnForStage(stage: string): number {
  const n = normalizeStage(stage)
  const i = (STAGE_KEYS as readonly string[]).indexOf(n)
  return i >= 0 ? i : 0
}

function stageForColumn(col: number): string {
  return STAGE_KEYS[col]
}

function ownerInitials(deal: Deal): string {
  const o = deal.owner
  if (o?.name) {
    const parts = o.name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return (parts[0].slice(0, 2) || '??').toUpperCase()
  }
  if (o?.email) {
    const pre = o.email.split('@')[0]
    const parts = pre.split(/[._-]/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return (pre.slice(0, 2) || '??').toUpperCase()
  }
  return '??'
}

function getLabelForDeal(deal: Deal): string {
  const n = normalizeStage(deal.stage)
  const prob = deal.probability ?? 0
  if (n === 'closed_won') return 'High Priority'
  if (n === 'closed_lost') return 'Not that important'
  if (prob >= 80) return 'High Priority'
  if (prob >= 60) return 'Important'
  if (prob >= 40) return 'OK'
  if (prob >= 20) return 'Maybe important'
  if (prob >= 10) return 'Low Priority'
  return 'Meh'
}

export default function DealsKanban({
  deals,
  onDealClick,
  onDealDetailView,
  onAddressClick,
  onDealUpdate,
  onDealDelete,
  onAddDeal,
}: DealsKanbanProps) {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)

  const buckets: Deal[][] = STAGE_KEYS.map(() => [])
  for (const d of deals) {
    const col = columnForStage(d.stage)
    buckets[col].push(d)
  }

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', deal.id)
    e.dataTransfer.setData('application/x-deal-id', deal.id)
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGOODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    if (e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(img, 0, 0)
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDragEnd = () => setDraggedDeal(null)

  const handleDrop = async (col: number) => {
    if (!draggedDeal) return
    const target = stageForColumn(col)
    const current = normalizeStage(draggedDeal.stage)
    if (columnForStage(current) !== col) {
      await onDealUpdate(draggedDeal.id, { stage: target })
    }
    setDraggedDeal(null)
  }

  const dashboardCardClass =
    'border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)]'
  const dashboardCardHoverClass =
    'hover:shadow-[0_24px_56px_-12px_rgba(93,135,255,0.18)] dark:hover:shadow-[0_24px_56px_-12px_rgba(0,0,0,0.4)] hover:border-blue-200 dark:hover:border-blue-800'

  function LeadCard({ deal }: { deal: Deal }) {
    const imgUrl = (deal as any).primary_photo || PLACEHOLDER_IMAGE
    const estValue = deal.forecast_value ?? deal.value ?? (deal as any).property_value
    const listedPrice = (deal as any).property_value ?? deal.value

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, deal)}
        onDragEnd={handleDragEnd}
        onClick={() => onDealClick(deal)}
        className={`bg-white dark:bg-slate-800/80 p-4 rounded-2xl ${dashboardCardClass} ${dashboardCardHoverClass} transition-all duration-300 cursor-grab active:cursor-grabbing group relative overflow-hidden`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-full h-32 rounded-xl overflow-hidden mb-3">
          <img
            alt="Property"
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            src={imgUrl}
          />
          <div className="absolute top-2 right-2">
            <div
              className="w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="w-full h-full flex items-center justify-center" aria-label="Deal actions">
                    <span className="material-symbols-outlined text-[14px]">more_horiz</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDealClick(deal) }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!window.confirm(`Delete "${deal.title || 'Untitled deal'}"?`)) return
                      await onDealDelete(deal.id)
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-bold uppercase tracking-wide rounded-md shadow-sm">
              {getLabelForDeal(deal)}
            </span>
          </div>
        </div>
        <div className="px-1">
          <h4 className="font-bold text-gray-900 mb-0.5 text-[15px]">{deal.title || 'Untitled deal'}</h4>
          <p
            className="text-xs text-slate-500 mb-3 line-clamp-1 font-medium flex items-center gap-1 cursor-pointer hover:text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              if (onAddressClick) {
                onAddressClick(deal)
              } else {
                onDealDetailView ? onDealDetailView(deal) : onDealClick(deal)
              }
            }}
          >
            <span className="material-symbols-outlined text-[14px] text-gray-400">location_on</span>
            {deal.property_address || 'Address not available'}
          </p>
          <div className="space-y-1.5 mb-4 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Est. Value</span>
              <span className="font-bold text-gray-700">{fmtCurrency(estValue)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Listed</span>
              <span className="font-bold text-gray-700">{fmtCurrency(listedPrice)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white shadow-sm">
              {ownerInitials(deal)}
            </div>
            <div className="flex gap-2 text-gray-400 items-center">
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
                <span className="material-symbols-outlined text-[12px]">timer</span>
                <span className="text-[10px] font-bold text-gray-600">{daysSince(deal.created_at)}d</span>
              </div>
              <span
                className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                onClick={(e) => {
                  e.stopPropagation()
                  onDealDetailView ? onDealDetailView(deal) : onDealClick(deal)
                }}
              >
                Details <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function ClosedWonCard({ deal }: { deal: Deal }) {
    const estValue = deal.forecast_value ?? deal.value ?? (deal as any).property_value

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, deal)}
        onDragEnd={handleDragEnd}
        onClick={() => onDealClick(deal)}
        className={`bg-white dark:bg-slate-800/80 p-5 rounded-2xl ${dashboardCardClass} ${dashboardCardHoverClass} hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 cursor-grab active:cursor-grabbing group relative overflow-hidden`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
              <span className="material-symbols-outlined text-[16px]">business</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide rounded-full">
              {getLabelForDeal(deal)}
            </span>
          </div>
          <button
            type="button"
            className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="material-symbols-outlined text-[18px] cursor-pointer">more_horiz</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDealClick(deal) }}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!window.confirm(`Delete "${deal.title || 'Untitled deal'}"?`)) return
                    await onDealDelete(deal.id)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </button>
        </div>
        <h4 className="font-bold text-gray-900 mb-1 text-[15px]">{deal.title || 'Untitled deal'}</h4>
        <p
          className="text-xs text-slate-500 mb-4 line-clamp-1 font-medium cursor-pointer hover:text-blue-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation()
            if (onAddressClick) {
              onAddressClick(deal)
            } else {
              onDealDetailView ? onDealDetailView(deal) : onDealClick(deal)
            }
          }}
        >
          {deal.property_address || 'Address not available'}
        </p>
        <div className="space-y-1.5 mb-5 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500 font-medium">Est. Value</span>
            <span className="font-bold text-gray-700">{fmtCurrency(estValue)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500 font-medium">Close Date</span>
            <span className="font-bold text-gray-700">{fmtShortDate(deal.expected_close_date)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white shadow-sm">
            {ownerInitials(deal)}
          </div>
          <div className="flex gap-3 text-gray-400">
            <div className="flex items-center gap-1 hover:text-emerald-500 transition-colors bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span className="text-[10px] font-bold text-gray-600">{daysSince(deal.updated_at || deal.created_at)}d</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-50 text-right">
          <span
            className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-700 flex items-center justify-end gap-1 group-hover:translate-x-1 transition-transform cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onDealDetailView ? onDealDetailView(deal) : onDealClick(deal)
            }}
          >
            View Details <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </span>
        </div>
      </div>
    )
  }

  function DealCard({ deal, stageKey }: { deal: Deal; stageKey: string }) {
    if (stageKey === 'new') return <LeadCard deal={deal} />
    if (stageKey === 'closed_won') return <ClosedWonCard deal={deal} />
    return <LeadCard deal={deal} />
  }

  return (
    <main className="flex-1 min-h-0 min-w-0 w-full overflow-x-auto overflow-y-hidden kanban-container px-8 pb-8 pt-2">
      <div className="flex gap-6 min-w-max pb-4 h-full min-h-0">
        {STAGE_KEYS.map((stageKey, i) => {
          const list = buckets[i]
          const cfg = STAGE_CONFIG[stageKey]
          const totalValue = list.reduce((sum, d) => sum + ((d.value ?? d.forecast_value ?? (d as any).property_value) || 0), 0)

          return (
            <div
              key={stageKey}
              className="w-80 flex flex-col flex-shrink-0 h-full min-h-0"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
            >
              <div
                className={`${cfg.headerBg} rounded-[1.25rem] p-3 flex items-center justify-between mb-4 border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] backdrop-blur-sm shrink-0`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-8 h-8 rounded-full ${cfg.headerIcon} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[18px]">{cfg.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-gray-800 font-bold text-sm leading-tight">{cfg.label}</h3>
                    <p className={`text-[10px] font-semibold ${cfg.headerCount}`}>
                      {list.length} deal{list.length !== 1 ? 's' : ''} • {fmtCurrency(totalValue)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddDeal?.(stageKey)
                  }}
                  className={`text-gray-400 rounded-full w-7 h-7 flex items-center justify-center transition-colors ${cfg.addBtn}`}
                  aria-label={`Add deal to ${cfg.label}`}
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
              </div>

              {list.length > 0 ? (
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-4 pr-2 custom-scrollbar">
                  {list.map((d) => (
                    <DealCard key={d.id} deal={d} stageKey={stageKey} />
                  ))}
                </div>
              ) : (
                <div
                  className={`flex-1 min-h-[140px] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/30 dark:bg-slate-800/30 flex flex-col items-center justify-center gap-3 group ${cfg.dropZone} transition-all cursor-pointer`}
                  onClick={() => onAddDeal?.(stageKey)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                >
                  <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <span className={`material-symbols-outlined text-gray-300 text-2xl ${cfg.addBtnHover}`}>add</span>
                  </div>
                  <p className={`text-xs text-gray-400 font-medium ${cfg.dropZoneHover}`}>Drop leads here</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
