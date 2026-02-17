'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface StepMetrics {
  step_id: string
  step_number: number
  subject: string
  metrics: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    open_rate: string
    click_rate: string
  }
}

interface StepAnalyticsProps {
  campaignId: string
  timeRange: string
}

const PAGE_SIZE = 10

export default function StepAnalytics({ campaignId, timeRange }: StepAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [stepAnalytics, setStepAnalytics] = useState<StepMetrics[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchStepAnalytics()
  }, [campaignId, timeRange])

  const fetchStepAnalytics = async () => {
    if (!campaignId) return

    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      let startDate: string | null = null
      let endDate: string | null = null

      switch (timeRange) {
        case 'Last 7 days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
        case 'Last 4 weeks':
          startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
        case 'Last 3 months':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          break
      }

      const url = new URL(`/api/campaigns/${campaignId}/steps/analytics`, window.location.origin)
      if (startDate) url.searchParams.set('start_date', startDate)
      if (endDate) url.searchParams.set('end_date', endDate)

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Failed to fetch step analytics')

      const data = await response.json()
      setStepAnalytics(data.step_analytics || [])
      setPage(1)
    } catch (err: any) {
      setError(err.message || 'Failed to load step analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-step-analytics-loading>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center" data-step-analytics-error>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (stepAnalytics.length === 0) {
    return (
      <div className="p-8 text-center" data-step-analytics-empty>
        <p className="text-gray-600 dark:text-gray-400">No step analytics available yet</p>
      </div>
    )
  }

  const total = stepAnalytics.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, total)
  const rows = stepAnalytics.slice(start, end)

  return (
    <div data-step-analytics-table className="divide-y divide-slate-200 dark:divide-slate-600 bg-white dark:bg-slate-800 overflow-x-auto">
      {/* Header row */}
      <div className="min-w-[900px] grid grid-cols-12 gap-4 px-6 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-600">
        <div className="col-span-1 pl-2">Step</div>
        <div className="col-span-4">Subject</div>
        <div className="col-span-1 text-center">Sent</div>
        <div className="col-span-1 text-center">Opened</div>
        <div className="col-span-1 text-center">Clicked</div>
        <div className="col-span-2">Open Rate</div>
        <div className="col-span-2">Click Rate</div>
      </div>
      {/* Data rows */}
      {rows.map((step) => {
        const openPct = Math.min(parseFloat(step.metrics.open_rate) || 0, 100)
        const clickPct = Math.min(parseFloat(step.metrics.click_rate) || 0, 100)
        return (
          <div
            key={step.step_id}
            className="min-w-[900px] grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
          >
            <div className="col-span-1 pl-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center text-xs font-bold ring-1 ring-blue-100 dark:ring-blue-800">
                {step.step_number}
              </div>
            </div>
            <div className="col-span-4 text-sm font-medium text-slate-500 dark:text-slate-400 italic group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {step.subject || '<Empty subject>'}
            </div>
            <div className="col-span-1 text-center text-sm font-semibold text-slate-900 dark:text-white">
              {step.metrics.sent}
            </div>
            <div className="col-span-1 text-center text-sm font-semibold text-slate-900 dark:text-white">
              {step.metrics.opened}
            </div>
            <div className="col-span-1 text-center text-sm font-semibold text-slate-900 dark:text-white">
              {step.metrics.clicked}
            </div>
            <div className="col-span-2 flex flex-col justify-center pr-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  {openPct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-[#2563eb] transition-all"
                  style={{ width: `${openPct}%` }}
                />
              </div>
            </div>
            <div className="col-span-2 flex flex-col justify-center pr-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  {clickPct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-[#2563eb] transition-all"
                  style={{ width: `${clickPct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
      {/* Footer */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-800">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing {start + 1} to {end} of {total} results
        </div>
        <div className="flex items-center space-x-1" data-step-analytics-pagination>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all disabled:opacity-50"
          >
            <span className="material-icons-outlined text-sm" aria-hidden>chevron_left</span>
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white text-xs font-bold shadow-sm transition-colors bg-[#2563eb]"
          >
            {page}
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all disabled:opacity-50"
          >
            <span className="material-icons-outlined text-sm" aria-hidden>chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}

