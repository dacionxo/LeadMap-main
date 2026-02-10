'use client'

import { useState, useEffect, useCallback } from 'react'
import DatePicker from './DatePicker'
import { useApp } from '@/app/providers'

interface Deal {
  id?: string
  title: string
  value?: number | null
  stage: string
  expected_close_date?: string | null
  property_address?: string | null
  pipeline_id?: string | null
  owner_id?: string | null
  probability?: number
  notes?: string
}

interface Pipeline {
  id: string
  name: string
  stages: string[]
  is_default?: boolean
}

interface User {
  id: string
  name: string
  email: string
}

interface EditDealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (deal: Partial<Deal>) => Promise<void>
  deal: Deal | null
  pipelines?: Pipeline[]
  users?: User[]
}

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']

const STEP_LABELS = ['Lead', 'Contact', 'Qualify', 'Proposal', 'Done'] as const

const STAGE_TO_STEP_INDEX: Record<string, number> = {
  new: 0,
  contacted: 1,
  qualified: 2,
  proposal: 3,
  negotiation: 4,
  closed_won: 4,
  closed_lost: 4,
}

function getStepIndex(stage: string): number {
  return STAGE_TO_STEP_INDEX[stage] ?? 0
}

function getOwnerInitials(user: User): string {
  if (user?.name) {
    const parts = user.name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return (parts[0].slice(0, 2) || '??').toUpperCase()
  }
  if (user?.email) {
    const pre = user.email.split('@')[0]
    const parts = pre.split(/[._-]/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return (pre.slice(0, 2) || '??').toUpperCase()
  }
  return '??'
}

function formatValueForInput(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return ''
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function parseValueFromInput(s: string): number | null {
  const cleaned = s.replace(/,/g, '').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

const MOCK_ACTIVITY = [
  { time: 'Just now', text: 'Stage moved to', highlight: 'Qualified' },
  { time: '2 hours ago', text: 'Note added by', highlight: 'Tyquan' },
  { time: 'Yesterday', text: 'Deal created', highlight: null },
]

export default function EditDealModal({
  isOpen,
  onClose,
  onSave,
  deal,
  pipelines = [],
  users = [],
}: EditDealModalProps) {
  const { user: currentUser } = useApp()
  const [formData, setFormData] = useState<Partial<Deal>>({
    title: '',
    value: null,
    stage: 'new',
    expected_close_date: null,
    property_address: null,
    pipeline_id: null,
    owner_id: null,
    probability: 0,
    notes: '',
  })
  const [valueInput, setValueInput] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultPipeline = pipelines.find((p) => (p as Pipeline).is_default) || pipelines[0]

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title || '',
        value: deal.value ?? null,
        stage: deal.stage || 'new',
        expected_close_date: deal.expected_close_date || null,
        property_address: deal.property_address || null,
        pipeline_id: deal.pipeline_id || null,
        owner_id: deal.owner_id || null,
        probability: deal.probability ?? 0,
        notes: deal.notes || '',
      })
      setValueInput(formatValueForInput(deal.value ?? null))
    } else {
      setFormData({
        title: '',
        value: null,
        stage: 'new',
        expected_close_date: null,
        property_address: null,
        pipeline_id: defaultPipeline?.id ?? null,
        owner_id: currentUser?.id ?? null,
        probability: 0,
        notes: '',
      })
      setValueInput('')
    }
  }, [deal, isOpen, defaultPipeline?.id, currentUser?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving deal:', error)
      alert('Failed to save deal')
    } finally {
      setLoading(false)
    }
  }

  const handleValueInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '').trim()
    setValueInput(e.target.value)
    const n = parseFloat(raw)
    setFormData((prev) => ({ ...prev, value: raw === '' ? null : isNaN(n) ? prev.value : n }))
  }, [])

  const handleValueBlur = useCallback(() => {
    const n = formData.value
    setValueInput(formatValueForInput(n ?? null))
  }, [formData.value])

  const selectedOwner = users.find((u) => u.id === formData.owner_id)
  const currentStepIndex = getStepIndex(formData.stage || 'new')

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-deal-title"
    >
      <div className="bg-card-light dark:bg-card-dark rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl ring-1 ring-black/5 border border-border-light dark:border-border-dark flex overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
        {/* Left sidebar - Recent Activity */}
        <div className="w-64 bg-gray-50 dark:bg-slate-800/80 border-r border-border-light dark:border-border-dark flex-shrink-0 hidden md:flex flex-col">
          <div className="p-6 pb-4 border-b border-border-light dark:border-border-dark">
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-blue-500">history</span>
              Recent Activity
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="relative pl-4 border-l-2 border-border-light dark:border-border-dark space-y-6">
              {MOCK_ACTIVITY.map((item, i) => (
                <div key={i} className="relative">
                  <div
                    className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                      i === 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                    aria-hidden
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{item.time}</p>
                  <p className="text-xs font-medium text-gray-800 dark:text-slate-200">
                    {item.text}
                    {item.highlight && (
                      <span className="text-blue-600 dark:text-blue-400"> {item.highlight}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content - ~15% smaller spacing/sizes (ratios preserved) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-col px-6 pt-5 pb-1.5 shrink-0 bg-card-light dark:bg-card-dark z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 id="edit-deal-title" className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {deal ? 'Edit Deal' : 'Create Deal'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Stage stepper */}
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className="flex items-center flex-1">
                {STEP_LABELS.map((label, i) => {
                  const isComplete = currentStepIndex > i
                  const isCurrent = currentStepIndex === i
                  return (
                    <div key={label} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1 relative z-10 shrink-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                            isComplete
                              ? 'bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-900/30'
                              : isCurrent
                                ? 'bg-white dark:bg-slate-800 border-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark text-gray-400 dark:text-slate-500'
                          }`}
                        >
                          {isComplete ? (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          ) : (
                            i + 1
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wide ${
                            isComplete
                              ? 'text-blue-600 dark:text-blue-400'
                              : isCurrent
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-slate-500'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      {i < STEP_LABELS.length - 1 && (
                        <div className="flex-1 h-0.5 bg-border-light dark:bg-border-dark mx-1.5 -mt-3.5 relative overflow-hidden min-w-[6px]">
                          {currentStepIndex > i && (
                            <div className="absolute inset-y-0 left-0 w-full bg-blue-600 dark:bg-blue-500 transition-all" />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-3 modal-scroll min-h-0">
            <div className="space-y-5 pb-1.5">
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">title</span>
                  Deal Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
                  placeholder="Deal Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">alt_route</span>
                    Pipeline
                  </label>
                  <div className="relative">
                    <select
                      value={formData.pipeline_id || ''}
                      onChange={(e) => setFormData({ ...formData, pipeline_id: e.target.value || null })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all appearance-none font-medium pr-9"
                      aria-label="Pipeline"
                      required={!deal}
                    >
                      <option value="">Select pipeline...</option>
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3.5 pointer-events-none text-gray-400 dark:text-slate-500">
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">flag</span>
                    Stage
                  </label>
                  <div className="relative">
                    <select
                      value={formData.stage || 'new'}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all appearance-none font-medium pr-9"
                      aria-label="Stage"
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage.charAt(0).toUpperCase() + stage.slice(1).replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3.5 pointer-events-none text-gray-400 dark:text-slate-500">
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">location_city</span>
                  Property Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.property_address || ''}
                    onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
                    placeholder="Search address..."
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 dark:text-slate-500">
                    <span className="material-symbols-outlined text-lg">search</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">attach_money</span>
                    Value
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={valueInput}
                      onChange={handleValueInputChange}
                      onBlur={handleValueBlur}
                      className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 dark:text-slate-500 font-bold">
                      $
                    </div>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">trending_up</span>
                    Probability
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.probability ?? ''}
                      onChange={(e) =>
                        setFormData({ ...formData, probability: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400 dark:text-slate-500 font-bold">
                      %
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">event</span>
                    Expected Close
                  </label>
                  <DatePicker
                    value={formData.expected_close_date}
                    onChange={(date) => setFormData({ ...formData, expected_close_date: date })}
                    placeholder="MM/DD/YYYY"
                    inputClassName="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                    <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">person</span>
                    Owner
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none z-10">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-white dark:ring-slate-900">
                        {selectedOwner ? getOwnerInitials(selectedOwner) : '??'}
                      </div>
                    </div>
                    <select
                      value={formData.owner_id || ''}
                      onChange={(e) => setFormData({ ...formData, owner_id: e.target.value || null })}
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all appearance-none font-medium"
                      aria-label="Owner"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.id === currentUser?.id ? `${u.name || u.email} (You)` : u.name || u.email}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3.5 pointer-events-none text-gray-400 dark:text-slate-500">
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                  <span className="material-symbols-outlined text-base text-gray-400 dark:text-slate-500">notes</span>
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-gray-800 dark:text-slate-200 input-focus-glow focus:ring-0 bg-white dark:bg-slate-800 text-[13px] shadow-soft transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
                  placeholder="Add notes..."
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-end shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-2.5 rounded-full font-bold shadow-soft transition-all transform active:scale-95 text-[13px] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Saving...' : deal ? 'Done' : 'Create Deal'}
              <span className="material-symbols-outlined text-base">check</span>
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}
