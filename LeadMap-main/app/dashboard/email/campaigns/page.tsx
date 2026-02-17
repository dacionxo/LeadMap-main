'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import AppNavSidebar from '../../components/AppNavSidebar'
import DealsNavbar from '../../crm/deals/components/DealsNavbar'

interface Campaign {
  id: string
  name: string
  status: string
  send_strategy: string
  start_at?: string
  total_recipients: number
  sent_count: number
  completed_count: number
  pending_count: number
  failed_count: number
  click_count?: number
  reply_count?: number
  open_count?: number
  opportunities?: number
  tags?: string[]
}

type StatusFilterValue =
  | 'All statuses'
  | 'Draft'
  | 'Scheduled'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Cancelled'

type SortOrderValue = 'Newest first' | 'Oldest first' | 'Name A-Z' | 'Name Z-A'

const STATUS_FILTER_OPTIONS: StatusFilterValue[] = [
  'All statuses',
  'Draft',
  'Scheduled',
  'Running',
  'Paused',
  'Completed',
  'Cancelled',
]

const SORT_OPTIONS: SortOrderValue[] = [
  'Newest first',
  'Oldest first',
  'Name A-Z',
  'Name Z-A',
]

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<StatusFilterValue>('All statuses')
  const [sortOrder, setSortOrder] = useState<SortOrderValue>('Newest first')
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set())
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/campaigns')
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      
      const data = await response.json()
      // Enhance campaigns with analytics data (fetch in background, don't block)
      const campaignsList = data.campaigns || []
      setCampaigns(campaignsList.map((campaign: Campaign) => ({
        ...campaign,
        click_count: 0,
        reply_count: 0,
        open_count: 0,
        opportunities: 0
      })))

      // Fetch analytics in background and update
      Promise.all(
        campaignsList.map(async (campaign: Campaign) => {
          try {
            const reportResponse = await fetch(`/api/campaigns/${campaign.id}/report`)
            if (reportResponse.ok) {
              const reportData = await reportResponse.json()
              const stats = reportData.overall_stats || {}
              return {
                id: campaign.id,
                click_count: stats.emails_clicked || 0,
                reply_count: stats.emails_replied || 0,
                open_count: stats.emails_opened || 0
              }
            }
          } catch (err) {
            // Silently fail - analytics are optional
          }
          return null
        })
      ).then(results => {
        setCampaigns(prev => prev.map(campaign => {
          const analytics = results.find(r => r && r.id === campaign.id)
          if (analytics) {
            return { ...campaign, ...analytics }
          }
          return campaign
        }))
      })
    } catch (err) {
      console.error('Error loading campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase()

    if (normalizedStatus === 'running') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
          Running
        </span>
      )
    }

    if (normalizedStatus === 'scheduled') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
          Scheduled
        </span>
      )
    }

    if (normalizedStatus === 'paused') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
          Paused
        </span>
      )
    }

    if (normalizedStatus === 'completed') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
          Completed
        </span>
      )
    }

    if (normalizedStatus === 'cancelled') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
          Cancelled
        </span>
      )
    }

    if (normalizedStatus === 'draft') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-900 text-white dark:bg-slate-700 dark:text-white border border-slate-800 dark:border-slate-600">
          Draft
        </span>
      )
    }

    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All statuses' || campaign.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const sortedCampaigns = useMemo(() => {
    const copy = [...filteredCampaigns]

    if (sortOrder === 'Name A-Z') {
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    }

    if (sortOrder === 'Name Z-A') {
      return copy.sort((a, b) => b.name.localeCompare(a.name))
    }

    if (sortOrder === 'Oldest first') {
      return copy.sort(
        (a, b) =>
          new Date(a.start_at || a.id).getTime() -
          new Date(b.start_at || b.id).getTime()
      )
    }

    return copy.sort(
      (a, b) =>
        new Date(b.start_at || b.id).getTime() -
        new Date(a.start_at || a.id).getTime()
    )
  }, [filteredCampaigns, sortOrder])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(new Set(sortedCampaigns.map(c => c.id)))
    } else {
      setSelectedCampaigns(new Set())
    }
  }

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    const newSelected = new Set(selectedCampaigns)
    if (checked) {
      newSelected.add(campaignId)
    } else {
      newSelected.delete(campaignId)
    }
    setSelectedCampaigns(newSelected)
  }

  const formatMetric = (value: number | undefined, isDraft: boolean) => {
    if (isDraft || value === undefined || value === 0) return '-'
    return value.toString()
  }

  const getProgressLabel = (campaign: Campaign) => {
    const isDraft = campaign.status.toLowerCase() === 'draft'
    if (isDraft) return '-'
    if (!campaign.total_recipients) return '0%'
    const percent = Math.round((campaign.sent_count / campaign.total_recipients) * 100)
    if (Number.isNaN(percent)) return '-'
    return `${percent}%`
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete campaign')
      }

      // Remove from local state
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      setSelectedCampaigns(prev => {
        const newSet = new Set(prev)
        newSet.delete(campaignId)
        return newSet
      })
    } catch (err: any) {
      alert(err.message || 'Failed to delete campaign')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCampaigns.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedCampaigns.size} campaign(s)? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      const deletePromises = Array.from(selectedCampaigns).map(campaignId =>
        fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
      )

      const results = await Promise.allSettled(deletePromises)
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))

      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} campaign(s)`)
      }

      // Refresh campaigns
      await fetchCampaigns()
      setSelectedCampaigns(new Set())
    } catch (err: any) {
      alert(err.message || 'Failed to delete campaigns')
    } finally {
      setDeleting(false)
    }
  }

  const handleStartTagging = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId)
    setEditingTags(campaignId)
    setTagInput(campaign?.tags?.join(', ') || '')
  }

  const handleBulkTag = async () => {
    if (selectedCampaigns.size === 0) return

    // For bulk tagging, we'll tag all selected campaigns with the same tags
    // First, get tags from the first selected campaign or use empty
    const firstCampaign = campaigns.find(c => selectedCampaigns.has(c.id))
    const initialTags = firstCampaign?.tags?.join(', ') || ''
    
    // Prompt user for tags
    const tagsInput = prompt('Enter tags (comma-separated):', initialTags)
    if (tagsInput === null) return // User cancelled

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)

    try {
      const updatePromises = Array.from(selectedCampaigns).map(campaignId =>
        fetch(`/api/campaigns/${campaignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags })
        })
      )

      const results = await Promise.allSettled(updatePromises)
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))

      if (failed.length > 0) {
        alert(`Failed to update tags for ${failed.length} campaign(s)`)
      } else {
        // Refresh campaigns
        await fetchCampaigns()
        setSelectedCampaigns(new Set())
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update tags')
    }
  }

  const handleSaveTags = async (campaignId: string) => {
    try {
      const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
      
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update tags')
      }

      // Update local state
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, tags } : c
      ))
      setEditingTags(null)
      setTagInput('')
    } catch (err: any) {
      alert(err.message || 'Failed to update tags')
    }
  }

  const handleCancelTagging = () => {
    setEditingTags(null)
    setTagInput('')
  }

  return (
    <DashboardLayout fullBleed hideHeader>
      {/* Campaigns layout: scrollable modal = [data-campaigns-modal] or [data-campaigns-scrollable]; card = [data-campaigns-container] > [data-campaigns-card] */}
      <div className="-mt-[30px]">
        <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-[#F8FAFC] dark:bg-[#0F172A] overflow-hidden">
          <DealsNavbar />
          <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
            <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
              <AppNavSidebar />
              <div className="flex-1 bg-white dark:bg-[#1c2536] rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative">
                <div
                  className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
                  aria-hidden
                />
                <div
                  className="flex-1 flex flex-col min-h-0 overflow-y-auto font-display antialiased selection:bg-[#2563EB] selection:text-white p-6 sm:p-10 text-slate-700 dark:text-slate-200"
                  data-campaigns-modal
                  data-campaigns-scrollable
                >
                  <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" aria-hidden>
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 dark:bg-blue-900/10 blur-3xl" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 dark:bg-indigo-900/10 blur-3xl" />
                  </div>

                  <div
                    className="max-w-[1400px] mx-auto w-full relative z-0"
                    data-campaigns-container
                  >
                    <div
                      className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                      data-campaigns-card
                      role="region"
                      aria-label="Campaigns table"
                    >
                      <div className="p-8 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Campaigns
                </h1>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative w-full lg:flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-icons-round text-slate-400 dark:text-slate-500 text-xl">
                      search
                    </span>
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] sm:text-sm transition duration-150 ease-in-out shadow-sm"
                    placeholder="Search..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search campaigns"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                  <div className="relative">
                    <button
                      className="inline-flex items-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] transition-colors"
                      type="button"
                      onClick={() => {
                        setIsStatusMenuOpen((prev) => !prev)
                        setIsSortMenuOpen(false)
                      }}
                      aria-haspopup="menu"
                      aria-expanded={isStatusMenuOpen}
                    >
                      <span className="material-icons-round text-base mr-2 text-slate-400 dark:text-slate-500">
                        flash_on
                      </span>
                      {statusFilter}
                      <span className="material-icons-round text-base ml-2 text-slate-400 dark:text-slate-500">
                        expand_more
                      </span>
                    </button>

                    {isStatusMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden z-20"
                      >
                        {STATUS_FILTER_OPTIONS.map((option) => (
                          <button
                            key={option}
                            role="menuitem"
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            onClick={() => {
                              setStatusFilter(option)
                              setIsStatusMenuOpen(false)
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      className="inline-flex items-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] transition-colors"
                      type="button"
                      onClick={() => {
                        setIsSortMenuOpen((prev) => !prev)
                        setIsStatusMenuOpen(false)
                      }}
                      aria-haspopup="menu"
                      aria-expanded={isSortMenuOpen}
                    >
                      {sortOrder}
                      <span className="material-icons-round text-base ml-2 text-slate-400 dark:text-slate-500">
                        expand_more
                      </span>
                    </button>

                    {isSortMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden z-20"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option}
                            role="menuitem"
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            onClick={() => {
                              setSortOrder(option)
                              setIsSortMenuOpen(false)
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className="inline-flex items-center justify-center p-2.5 border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] transition-colors group"
                    type="button"
                    aria-label="Download campaigns"
                    onClick={() => {}}
                  >
                    <span className="material-icons-round text-xl text-slate-400 dark:text-slate-500 group-hover:text-[#2563EB] transition-colors">
                      download
                    </span>
                  </button>

                  {selectedCampaigns.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={deleting}
                        className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Delete ${selectedCampaigns.size} selected campaigns`}
                      >
                        Delete ({selectedCampaigns.size})
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkTag}
                        className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                        aria-label={`Tag ${selectedCampaigns.size} selected campaigns`}
                      >
                        Add Tags ({selectedCampaigns.size})
                      </button>
                    </>
                  )}

                  <button
                    className="inline-flex items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-[#2563EB] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] transition-all shadow-blue-500/20 hover:shadow-blue-500/40"
                    type="button"
                    onClick={() => router.push('/dashboard/email/campaigns/new')}
                    aria-label="Add new campaign"
                  >
                    <span className="material-icons-round text-lg mr-1.5">
                      add
                    </span>
                    Add New
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar border-t border-slate-200 dark:border-slate-700 mt-4">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left w-12" scope="col">
                      <input
                        className="h-4 w-4 text-[#2563EB] focus:ring-[#2563EB] border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                        type="checkbox"
                        checked={
                          selectedCampaigns.size === sortedCampaigns.length &&
                          sortedCampaigns.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all campaigns"
                      />
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Name
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Status
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Progress
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Sent
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Click
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Replied
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Opportunities
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                      scope="col"
                    >
                      Tags
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td className="px-6 py-8" colSpan={9}>
                        <div className="flex items-center justify-center py-12">
                          <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700 border-t-[#2563EB] rounded-full animate-spin" />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {sortedCampaigns.map((campaign) => {
                        const isDraft = campaign.status.toLowerCase() === 'draft'
                        const isSelected = selectedCampaigns.has(campaign.id)

                        return (
                          <tr
                            key={campaign.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                            onClick={() =>
                              router.push(`/dashboard/email/campaigns/${campaign.id}`)
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                router.push(`/dashboard/email/campaigns/${campaign.id}`)
                              }
                            }}
                            aria-label={`Open campaign ${campaign.name}`}
                          >
                            <td
                              className="px-6 py-5 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <input
                                className="h-4 w-4 text-[#2563EB] focus:ring-[#2563EB] border-gray-300 rounded dark:bg-slate-700 dark:border-slate-600"
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  handleSelectCampaign(campaign.id, e.target.checked)
                                }
                                aria-label={`Select campaign ${campaign.name}`}
                              />
                            </td>

                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="flex-shrink-0 h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 text-[#2563EB] flex items-center justify-center mr-3">
                                  <span className="material-icons-round text-base">
                                    campaign
                                  </span>
                                </span>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {campaign.name}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 whitespace-nowrap">
                              {getStatusBadge(campaign.status)}
                            </td>

                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                              {getProgressLabel(campaign)}
                            </td>

                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">
                              {formatMetric(campaign.sent_count, isDraft)}
                            </td>

                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">
                              {formatMetric(campaign.click_count, isDraft)}
                            </td>

                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">
                              {formatMetric(campaign.reply_count, isDraft)}
                            </td>

                            <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500">
                              {formatMetric(campaign.opportunities, isDraft)}
                            </td>

                            <td
                              className="px-6 py-5 whitespace-nowrap text-sm text-slate-400 dark:text-slate-500"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              {editingTags === campaign.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveTags(campaign.id)
                                      } else if (e.key === 'Escape') {
                                        handleCancelTagging()
                                      }
                                    }}
                                    placeholder="tag1, tag2, tag3"
                                    className="flex-1 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                    autoFocus
                                    aria-label="Edit campaign tags"
                                  />
                                  <button
                                    onClick={() => handleSaveTags(campaign.id)}
                                    className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    type="button"
                                    aria-label="Save tags"
                                  >
                                    <span className="material-icons-round text-base text-emerald-600">
                                      sell
                                    </span>
                                  </button>
                                  <button
                                    onClick={handleCancelTagging}
                                    className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    type="button"
                                    aria-label="Cancel tagging"
                                  >
                                    <span className="material-icons-round text-base text-slate-500">
                                      close
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {campaign.tags && campaign.tags.length > 0 ? (
                                    campaign.tags.map((tag, idx) => (
                                      <span
                                        key={`${campaign.id}-tag-${idx}`}
                                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-sm text-slate-400 dark:text-slate-500 italic">
                                      No tags
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    className="ml-1 inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => handleStartTagging(campaign.id)}
                                    aria-label={`Edit tags for ${campaign.name}`}
                                  >
                                    <span className="material-icons-round text-base text-slate-400 dark:text-slate-500">
                                      edit
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                    aria-label={`Delete campaign ${campaign.name}`}
                                  >
                                    <span className="material-icons-round text-base text-rose-500">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b-0 border-transparent">
                        <td className="px-6 py-8" colSpan={9}>
                          <div className="flex flex-col items-center justify-center text-center py-12">
                            <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800 mb-3">
                              <span className="material-icons-round text-4xl text-slate-300 dark:text-slate-600">
                                inbox
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {sortedCampaigns.length === 0
                                ? 'No campaigns found'
                                : 'No more campaigns found'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-400">
                    Showing{' '}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {sortedCampaigns.length > 0 ? 1 : 0}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {sortedCampaigns.length}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium text-slate-900 dark:text-white">
                      {sortedCampaigns.length}
                    </span>{' '}
                    results
                  </p>
                </div>

                <div>
                  <nav
                    aria-label="Pagination"
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  >
                    <button
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                      type="button"
                      aria-label="Previous page"
                      disabled
                    >
                      <span className="material-icons-round text-base">
                        chevron_left
                      </span>
                    </button>
                    <button
                      aria-current="page"
                      className="z-10 bg-[#2563EB] border-[#2563EB] text-white relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                      type="button"
                    >
                      1
                    </button>
                    <button
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                      type="button"
                      aria-label="Next page"
                      disabled
                    >
                      <span className="material-icons-round text-base">
                        chevron_right
                      </span>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
            </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
