'use client'

import { useState } from 'react'

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
  last_interaction?: string | null
  updated_at?: string | null
}

interface DealsKanbanProps {
  deals: Deal[]
  stages: string[]
  onDealClick: (deal: Deal) => void
  onDealUpdate: (dealId: string, updates: Partial<Deal>) => Promise<void>
  onDealDelete: (dealId: string) => Promise<void>
  pipelines?: Array<{ id: string; name: string; stages: string[] }>
  onAddDeal?: (stage?: string) => void
}

const COLUMN_BGS = ['#F8F8F8', '#FFE5EE', '#F0FFF0', '#E0FFFF'] as const
const BOARD_BG = '#F5F5F5'
const CARD_BG = '#FFFFFF'
const CARD_SHADOW = 'rgba(0, 0, 0, 0.08)'
const TEXT_MAJOR = '#000000'
const TEXT_MINOR = '#A9A9A9'
const SEPARATOR = '#E5E5E5'

const PILLS: Record<string, { label: string; bg: string }> = {
  new: { label: 'NEW', bg: '#32CD32' },
  contacted: { label: 'WORKING ON IT', bg: '#ADD8E6' },
  qualified: { label: 'SENT TO CLIENT FOR REVIEW', bg: '#4B0082' },
  proposal: { label: 'SENT TO CLIENT FOR REVIEW', bg: '#4B0082' },
  negotiation: { label: 'WAITING FOR INPUT', bg: '#FFA500' },
  closed_won: { label: 'CLOSED WON', bg: '#32CD32' },
  closed_lost: { label: 'NEED HELP', bg: '#FF0000' },
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
  return m[t] ?? t
}

function columnForStage(stage: string): number {
  const n = normalizeStage(stage)
  if (n === 'new' || n === 'contacted') return 0
  if (n === 'qualified' || n === 'proposal') return 1
  if (n === 'negotiation') return 2
  return 3
}

function isActive(deal: Deal): boolean {
  const ts = deal.last_interaction || deal.updated_at || deal.expected_close_date || deal.created_at
  if (!ts) return true
  const d = new Date(ts)
  const now = new Date()
  const days = (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)
  return days <= 14
}

function formatLastUpdated(deal: Deal): string {
  const ts = deal.last_interaction || deal.updated_at || deal.expected_close_date || deal.created_at
  if (!ts) return '—'
  const d = new Date(ts)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function getPill(deal: Deal): { label: string; bg: string } {
  const n = normalizeStage(deal.stage)
  return PILLS[n] ?? { label: n.replace(/_/g, ' ').toUpperCase(), bg: '#808080' }
}

export default function DealsKanban({
  deals,
  onDealClick,
  onDealUpdate,
  onDealDelete,
  pipelines = [],
  onAddDeal,
}: DealsKanbanProps) {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)

  const columns: { active: Deal[]; backlog: Deal[] }[] = [{ active: [], backlog: [] }, { active: [], backlog: [] }, { active: [], backlog: [] }, { active: [], backlog: [] }]
  for (const d of deals) {
    const col = columnForStage(d.stage)
    if (isActive(d)) columns[col].active.push(d)
    else columns[col].backlog.push(d)
  }

  const handleDragStart = (deal: Deal) => setDraggedDeal(deal)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDragEnd = () => setDraggedDeal(null)

  const stageForColumn = (col: number): string => {
    if (col === 0) return 'new'
    if (col === 1) return 'qualified'
    if (col === 2) return 'negotiation'
    return 'closed_won'
  }

  const handleDrop = async (col: number) => {
    if (!draggedDeal) return
    const target = stageForColumn(col)
    const current = normalizeStage(draggedDeal.stage)
    if (columnForStage(current) !== col) {
      await onDealUpdate(draggedDeal.id, { stage: target })
    }
    setDraggedDeal(null)
  }

  function Card({ deal }: { deal: Deal }) {
    const pill = getPill(deal)
    const desc = deal.description || deal.notes || deal.property_address || 'task description goes here'
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(deal)}
        onDragEnd={handleDragEnd}
        onClick={() => onDealClick(deal)}
        className="rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: CARD_BG,
          boxShadow: `0 1px 3px ${CARD_SHADOW}`,
        }}
      >
        <div className="p-3 flex flex-col gap-2">
          <span
            className="inline-flex items-center justify-center w-fit px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide text-white"
            style={{ backgroundColor: pill.bg }}
          >
            {pill.label}
          </span>
          <p className="font-bold text-sm truncate" style={{ color: TEXT_MAJOR }}>
            {deal.title || 'Short task name'}
          </p>
          <p className="text-xs line-clamp-2" style={{ color: TEXT_MINOR }}>
            {desc}
          </p>
        </div>
        <div className="h-px shrink-0" style={{ backgroundColor: SEPARATOR }} />
        <div className="px-3 py-2 flex items-center justify-between text-xs" style={{ color: TEXT_MINOR }}>
          <span>Last Updated</span>
          <span>{formatLastUpdated(deal)}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex gap-0 overflow-x-auto min-h-0 flex-1"
      style={{ backgroundColor: BOARD_BG }}
    >
      {columns.map((col, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[280px] flex flex-col overflow-y-auto"
          style={{ backgroundColor: COLUMN_BGS[i] }}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(i)}
        >
          <div className="px-3 py-3 flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: TEXT_MAJOR }}>
                ACTIVE
              </p>
              <div className="flex flex-col gap-2">
                {col.active.map((d) => (
                  <Card key={d.id} deal={d} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: TEXT_MAJOR }}>
                BACKLOG
              </p>
              <div className="flex flex-col gap-2">
                {col.backlog.map((d) => (
                  <Card key={d.id} deal={d} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
