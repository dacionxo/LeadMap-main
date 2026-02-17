'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/DashboardLayout'
import AppNavSidebar from '../../../components/AppNavSidebar'
import DealsNavbar from '../../../crm/deals/components/DealsNavbar'
import SequencesTabContent from './components/SequencesTab'
import LeadsTabContent from './components/LeadsTabContent'
import AddLeadsModal from './components/AddLeadsModal'
import ScheduleTab from './components/ScheduleTab'
import OptionsTab from './components/OptionsTab'
import StepAnalytics from './components/StepAnalytics'
import ActivityFeed from './components/ActivityFeed'
import { Loader2 } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  description?: string
  status: string
  send_strategy: string
  start_at?: string
  mailbox_id?: string
  mailbox?: {
    email: string
    display_name?: string
  }
  steps: Array<{
    id: string
    step_number: number
    delay_hours: number
    subject: string
  }>
  stats: {
    total_recipients: number
    total_sent: number
    total_failed: number
    completed: number
    pending: number
    bounced: number
    unsubscribed: number
  }
  // Campaign options
  stop_on_reply?: boolean
  open_tracking_enabled?: boolean
  click_tracking_enabled?: boolean
  link_tracking_enabled?: boolean
  text_only_mode?: boolean
  first_email_text_only?: boolean
  daily_cap?: number
  hourly_cap?: number
  total_cap?: number
  warmup_enabled?: boolean
  warmup_schedule?: any
  // Schedule fields
  timezone?: string
  send_window_start?: string
  send_window_end?: string
  send_days_of_week?: number[]
  end_at?: string | null
  // CRM
  owner_id?: string | null
  tags?: string[]
  // Sending Pattern
  time_gap_min?: number
  time_gap_random?: number
  max_new_leads_per_day?: number | null
  prioritize_new_leads?: boolean
  // Auto Optimize A/B Testing
  auto_optimize_split_test?: boolean
  split_test_winning_metric?: string
  // Provider Matching
  provider_matching_enabled?: boolean
  esp_routing_rules?: any[]
  // Email Compliance
  stop_company_on_reply?: boolean
  stop_on_auto_reply?: boolean
  unsubscribe_link_header?: boolean
  allow_risky_emails?: boolean
}

interface AnalyticsStats {
  sequence_started: number | null
  open_rate: {
    percentage: number
    count: number | null
  }
  click_rate: {
    percentage: number
    count: number | null
  }
  opportunities: {
    count: number
    revenue: number
  }
  conversions: {
    count: number
    revenue: number
  }
}

interface CampaignRecipient {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company: string | null
  address: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  status: string
  last_sent_at: string | null
  replied: boolean
  bounced: boolean
  unsubscribed: boolean
  created_at: string
}

type TabType = 'analytics' | 'leads' | 'sequences' | 'schedule' | 'options'
type ContentTabType = 'step-analytics' | 'activity'

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('analytics')
  const [activeContentTab, setActiveContentTab] = useState<ContentTabType>('step-analytics')
  const [timeRange, setTimeRange] = useState('Last 4 weeks')
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [showAddLeadsModal, setShowAddLeadsModal] = useState(false)
  const [recipientSearchQuery, setRecipientSearchQuery] = useState('')
  const [scheduleData, setScheduleData] = useState<any>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setCampaignId(id)
    })
  }, [params])

  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
      if (activeTab === 'analytics') {
        fetchAnalytics()
      }
      if (activeTab === 'leads') {
        fetchRecipients()
      }
      if (activeTab === 'schedule') {
        fetchSchedule()
      }
    }
  }, [campaignId, timeRange, activeTab])

  // Fetch analytics when time range changes (only if on analytics tab)
  useEffect(() => {
    if (campaignId && activeTab === 'analytics') {
      fetchAnalytics()
    }
  }, [timeRange])

  const fetchCampaign = async () => {
    if (!campaignId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}`)
      if (!response.ok) throw new Error('Failed to fetch campaign')
      
      const data = await response.json()
      setCampaign(data.campaign)
    } catch (err) {
      console.error('Error loading campaign:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (!campaignId) return
    try {
      // Calculate date range based on timeRange selection
      const now = new Date()
      let startDate: Date | null = null
      let endDate: Date | null = null

      switch (timeRange) {
        case 'Last 7 days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          endDate = now
          break
        case 'Last 4 weeks':
          startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
          endDate = now
          break
        case 'Last 3 months':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          endDate = now
          break
        case 'All time':
          startDate = null
          endDate = null
          break
      }

      const url = new URL(`/api/campaigns/${campaignId}/report`, window.location.origin)
      if (startDate) {
        url.searchParams.set('start_date', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        url.searchParams.set('end_date', endDate.toISOString().split('T')[0])
      }

      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        // Transform report data to analytics format
        const stats = data.overall_stats || {}
        setAnalytics({
          sequence_started: stats.emails_sent || 0,
          open_rate: {
            percentage: parseFloat(stats.open_rate || 0),
            count: stats.emails_opened || 0
          },
          click_rate: {
            percentage: parseFloat(stats.click_rate || 0),
            count: stats.emails_clicked || 0
          },
          opportunities: {
            count: 0, // TODO: Link to CRM opportunities
            revenue: 0
          },
          conversions: {
            count: 0, // TODO: Link to conversions
            revenue: 0
          }
        })
      }
    } catch (err) {
      console.error('Error loading analytics:', err)
    }
  }

  const fetchRecipients = async () => {
    if (!campaignId) return
    try {
      setRecipientsLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/recipients`)
      if (response.ok) {
        const data = await response.json()
        setRecipients(data.recipients || [])
      }
    } catch (err) {
      console.error('Error loading recipients:', err)
    } finally {
      setRecipientsLoading(false)
    }
  }

  const fetchSchedule = async () => {
    if (!campaignId) return
    try {
      setScheduleLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/schedule`)
      if (response.ok) {
        const data = await response.json()
        setScheduleData(data.schedule)
      }
    } catch (err) {
      console.error('Error loading schedule:', err)
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleResume = async () => {
    if (!campaign || !campaignId) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/resume`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        const errorMessage = data.error || 'Failed to resume campaign'
        const errorDetails = data.details ? `\n\nDetails: ${data.details}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }

      const result = await response.json()
      await fetchCampaign()
      
      // Show success message
      alert(result.message || 'Campaign resumed successfully!')
    } catch (err: any) {
      console.error('Resume campaign error:', err)
      const errorMessage = err.message || 'Failed to resume campaign'
      alert(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!campaign || !campaignId) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/pause`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        const errorMessage = data.error || 'Failed to pause campaign'
        const errorDetails = data.details ? `\n\nDetails: ${data.details}` : ''
        throw new Error(`${errorMessage}${errorDetails}`)
      }

      const result = await response.json()
      await fetchCampaign()
      
      // Show success message
      alert(result.message || 'Campaign paused successfully!')
    } catch (err: any) {
      console.error('Pause campaign error:', err)
      const errorMessage = err.message || 'Failed to pause campaign'
      alert(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadCSV = async () => {
    if (!campaign || !campaignId) {
      alert('Campaign not found')
      return
    }

    try {
      setActionLoading(true)
      setShowDropdown(false)
      
      // Fetch all recipients from the API
      const response = await fetch(`/api/campaigns/${campaignId}/recipients`)
      if (!response.ok) {
        throw new Error('Failed to fetch recipients')
      }

      const data = await response.json()
      const allRecipients = data.recipients || []

      if (allRecipients.length === 0) {
        alert('No recipients to export')
        return
      }

      // Create CSV content
      const csv = [
        ['Email', 'First Name', 'Last Name', 'Company', 'Status', 'Replied', 'Bounced', 'Unsubscribed', 'Last Sent', 'Created'].join(','),
        ...allRecipients.map((r: CampaignRecipient) => [
          r.email,
          r.first_name || '',
          r.last_name || '',
          r.company || '',
          r.status,
          r.replied ? 'Yes' : 'No',
          r.bounced ? 'Yes' : 'No',
          r.unsubscribed ? 'Yes' : 'No',
          r.last_sent_at ? new Date(r.last_sent_at).toLocaleDateString() : '',
          new Date(r.created_at).toLocaleDateString()
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Create and download the file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const campaignName = campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      a.download = `${campaignName}-recipients-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error exporting CSV:', err)
      alert(err.message || 'Failed to export CSV')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'paused') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" aria-hidden />
          Paused
        </span>
      )
    }
    const styles: Record<string, string> = {
      draft: 'bg-gray-800 text-white border border-transparent',
      scheduled: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
      running: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
      completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
      cancelled: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const calculateProgress = () => {
    if (!campaign) return 0
    
    // For draft campaigns, calculate completion based on setup requirements
    if (campaign.status === 'draft') {
      let completion = 0
      
      // 1. Campaign name (required) - 20%
      if (campaign.name && campaign.name.trim().length > 0) {
        completion += 20
      }
      
      // 2. Mailbox selection (required) - 20%
      if (campaign.mailbox_id) {
        completion += 20
      }
      
      // 3. At least one step/sequence with content (required) - 30%
      if (campaign.steps && campaign.steps.length > 0) {
        // Check if at least one step has valid content
        // A step is valid if it has a subject (not empty or placeholder) and html content
        const hasValidSteps = campaign.steps.some((step: any) => {
          const hasValidSubject = step.subject && 
            step.subject.trim() !== '' && 
            step.subject !== '<Empty subject>' &&
            step.subject.trim() !== 'Empty subject'
          const hasValidContent = step.html && step.html.trim() !== ''
          return hasValidSubject && hasValidContent
        })
        if (hasValidSteps) {
          completion += 30
        }
      }
      
      // 4. At least one recipient (required) - 30%
      if (campaign.stats && campaign.stats.total_recipients > 0) {
        completion += 30
      }
      
      return Math.min(completion, 100) // Cap at 100%
    }
    
    // For active campaigns, calculate based on sent/recipients
    if (campaign.stats && campaign.stats.total_recipients > 0) {
      return Math.round((campaign.stats.total_sent / campaign.stats.total_recipients) * 100)
    }
    
    return 0
  }

  // Calculate progress - must be before early returns to maintain hook order
  const progress = useMemo(() => calculateProgress(), [campaign])
  const isDraft = campaign?.status === 'draft'

  if (loading) {
    return (
      <DashboardLayout fullBleed hideHeader>
        <div className="-mt-[30px]">
          <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
            <DealsNavbar />
            <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
              <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
                <AppNavSidebar />
                <div className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative">
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!campaign) {
    return (
      <DashboardLayout fullBleed hideHeader>
        <div className="-mt-[30px]">
          <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
            <DealsNavbar />
            <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
              <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
                <AppNavSidebar />
                <div className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative">
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-400">Campaign not found</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout fullBleed hideHeader>
      {/* Campaign detail: same component layout as Unibox (sidebar + main card). Selectors: [data-campaign-detail-modal], [data-campaign-detail-header], [data-campaign-detail-tabs], [data-campaign-detail-content]. */}
      <div className="-mt-[30px]">
        <div className="fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden">
          <DealsNavbar />
          <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
            <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
              <AppNavSidebar />
              <div
                data-campaign-detail-modal
                className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative"
              >
                <div
                  className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
                  aria-hidden
                />
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Header */}
                  <header
                    data-campaign-detail-header
                    className="flex-none px-6 py-4 bg-white dark:bg-dark/90 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between z-10"
                  >
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/email/campaigns')}
                  className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2 -ml-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 mr-2"
                >
                  <span className="material-icons-outlined text-[18px] mr-1" aria-hidden>arrow_back</span>
                  Back to Campaigns
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-600 mr-4" aria-hidden />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {campaign.name}
                </h2>
                {getStatusBadge(campaign.status)}
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <span className="material-icons-outlined text-[18px] mr-2" aria-hidden>share</span>
                    Share
                  </button>
                  <div className="h-5 w-px bg-slate-200 dark:bg-slate-600 mx-1" aria-hidden />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-3 inline-flex justify-between items-center text-sm font-medium text-slate-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2563eb] shadow-sm"
                    >
                      {timeRange}
                      <span className="material-icons-outlined text-lg ml-2 text-slate-500 dark:text-slate-400" aria-hidden>expand_more</span>
                    </button>
                    {showDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} aria-hidden />
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 z-20 py-1">
                          {['Last 7 days', 'Last 4 weeks', 'Last 3 months', 'All time'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => { setTimeRange(opt); setShowDropdown(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                            >
                              {opt}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => { handleDownloadCSV(); setShowDropdown(false); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-t border-slate-200 dark:border-slate-600"
                          >
                            Download CSV
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {(campaign.status === 'paused' || campaign.status === 'draft') && (
                    <button
                      type="button"
                      onClick={handleResume}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-1.5 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-[#2563eb] hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563eb] transition-all disabled:opacity-50"
                    >
                      <span className="material-icons-outlined text-[18px] mr-1.5" aria-hidden>play_arrow</span>
                      {actionLoading ? (campaign.status === 'draft' ? 'Starting...' : 'Resuming...') : 'Resume'}
                    </button>
                  )}
                  {(campaign.status === 'running' || campaign.status === 'scheduled') && (
                    <button
                      type="button"
                      onClick={handlePause}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-1.5 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                    >
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="material-icons-outlined text-[20px]" aria-hidden>settings</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Sticky tabs */}
            <div
              data-campaign-detail-tabs
              className="sticky top-0 z-20 bg-white dark:bg-dark/90 border-b border-slate-200 dark:border-slate-600 px-6 sm:px-8"
            >
              <nav aria-label="Tabs" className="flex space-x-6">
                {(['analytics', 'leads', 'sequences', 'schedule', 'options'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`border-b-2 px-1 py-4 font-medium text-sm transition-colors whitespace-nowrap capitalize ${
                      activeTab === tab
                        ? 'border-[#2563eb] text-[#2563eb] font-semibold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Scrollable content */}
            <div
              data-campaign-detail-content
              className="flex-1 overflow-y-auto modal-scroll bg-gray-50/50 dark:bg-slate-900/50"
            >
              <div className="p-6 sm:p-8 space-y-8">
                {/* KPI cards - analytics tab */}
                {activeTab === 'analytics' && (
                  <div data-campaign-detail-kpi className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sequence started</p>
                        <span className="material-icons-outlined text-gray-400 text-sm cursor-help hover:text-gray-600 transition-colors" title="Info" aria-hidden>info</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {isDraft ? '0' : (analytics?.sequence_started ?? 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Open rate</p>
                        <span className="material-icons-outlined text-gray-400 text-sm cursor-help hover:text-gray-600 transition-colors" title="Info" aria-hidden>info</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {isDraft ? '0%' : `${analytics?.open_rate?.percentage.toFixed(0) ?? 0}%`}
                        </p>
                        <span className="text-gray-300 dark:text-gray-600 text-lg font-light" aria-hidden>|</span>
                        <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                          {isDraft ? '0' : (analytics?.open_rate?.count ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Click rate</p>
                        <span className="material-icons-outlined text-gray-400 text-sm cursor-help hover:text-gray-600 transition-colors" title="Info" aria-hidden>info</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {isDraft ? '0%' : `${analytics?.click_rate?.percentage.toFixed(0) ?? 0}%`}
                        </p>
                        <span className="text-gray-300 dark:text-gray-600 text-lg font-light" aria-hidden>|</span>
                        <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                          {isDraft ? '0' : (analytics?.click_rate?.count ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Opportunities</p>
                        <span className="material-icons-outlined text-gray-400 text-sm cursor-help hover:text-gray-600 transition-colors" title="Info" aria-hidden>info</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {analytics?.opportunities?.count ?? 0}
                        </p>
                        <span className="text-gray-300 dark:text-gray-600 text-lg font-light" aria-hidden>|</span>
                        <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                          ${analytics?.opportunities?.revenue.toLocaleString() ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conversions</p>
                        <span className="material-icons-outlined text-gray-400 text-sm cursor-help hover:text-gray-600 transition-colors" title="Info" aria-hidden>info</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {analytics?.conversions?.count ?? 0}
                        </p>
                        <span className="text-gray-300 dark:text-gray-600 text-lg font-light" aria-hidden>|</span>
                        <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                          ${analytics?.conversions?.revenue.toLocaleString() ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab content areas */}
                {activeTab === 'sequences' && campaignId && (
                  <SequencesTabContent campaignId={campaignId} campaignStatus={campaign?.status || 'draft'} />
                )}
                {activeTab === 'schedule' && campaignId && (
                  <ScheduleTab
                    campaignId={campaignId}
                    campaignStatus={campaign?.status || 'draft'}
                    initialSchedule={scheduleData || {
                      name: campaign?.name,
                      start_at: campaign?.start_at,
                      end_at: campaign?.end_at,
                      timezone: campaign?.timezone,
                      send_window_start: campaign?.send_window_start,
                      send_window_end: campaign?.send_window_end,
                      send_days_of_week: campaign?.send_days_of_week
                    }}
                  />
                )}
                {activeTab === 'leads' && (
                  <LeadsTabContent
                    recipients={recipients}
                    loading={recipientsLoading}
                    searchQuery={recipientSearchQuery}
                    onSearchChange={setRecipientSearchQuery}
                    onRefresh={fetchRecipients}
                    campaignId={campaignId || ''}
                    campaignStatus={campaign?.status || 'draft'}
                    onAddLeads={() => setShowAddLeadsModal(true)}
                  />
                )}
                {activeTab === 'options' && campaignId && campaign && (
                  <OptionsTab
                    campaignId={campaignId}
                    campaignStatus={campaign?.status || 'draft'}
                    mailboxId={campaign?.mailbox_id}
                    initialOptions={{
                      stop_on_reply: campaign?.stop_on_reply,
                      open_tracking_enabled: campaign?.open_tracking_enabled,
                      link_tracking_enabled: campaign?.link_tracking_enabled,
                      text_only_mode: campaign?.text_only_mode,
                      first_email_text_only: campaign?.first_email_text_only,
                      daily_cap: campaign?.daily_cap,
                      hourly_cap: campaign?.hourly_cap,
                      total_cap: campaign?.total_cap,
                      warmup_enabled: campaign?.warmup_enabled,
                      warmup_schedule: campaign?.warmup_schedule,
                      owner_id: campaign?.owner_id,
                      tags: campaign?.tags,
                      time_gap_min: campaign?.time_gap_min,
                      time_gap_random: campaign?.time_gap_random,
                      max_new_leads_per_day: campaign?.max_new_leads_per_day,
                      prioritize_new_leads: campaign?.prioritize_new_leads,
                      auto_optimize_split_test: campaign?.auto_optimize_split_test,
                      split_test_winning_metric: (campaign?.split_test_winning_metric && ['open_rate', 'click_rate', 'reply_rate', 'conversion_rate'].includes(campaign.split_test_winning_metric))
                        ? campaign.split_test_winning_metric as 'open_rate' | 'click_rate' | 'reply_rate' | 'conversion_rate'
                        : undefined,
                      provider_matching_enabled: campaign?.provider_matching_enabled,
                      esp_routing_rules: campaign?.esp_routing_rules,
                      stop_company_on_reply: campaign?.stop_company_on_reply,
                      stop_on_auto_reply: campaign?.stop_on_auto_reply,
                      unsubscribe_link_header: campaign?.unsubscribe_link_header,
                      allow_risky_emails: campaign?.allow_risky_emails
                    }}
                    onUpdate={fetchCampaign}
                  />
                )}

                {/* Analytics: Step Analytics card + Activity */}
                {activeTab === 'analytics' && (
                  <div data-campaign-step-analytics className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                    <div className="border-b border-slate-200 dark:border-slate-600 px-6 flex items-center justify-between bg-white dark:bg-slate-800/50">
                      <nav aria-label="Content tabs" className="flex space-x-6">
                        <button
                          type="button"
                          onClick={() => setActiveContentTab('step-analytics')}
                          className={`px-1 py-4 font-medium text-sm transition-colors ${
                            activeContentTab === 'step-analytics'
                              ? 'text-[#2563eb] border-b-2 border-[#2563eb] font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-b-2 border-transparent hover:border-gray-200'
                          }`}
                        >
                          Step Analytics
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveContentTab('activity')}
                          className={`px-1 py-4 font-medium text-sm transition-colors ${
                            activeContentTab === 'activity'
                              ? 'text-[#2563eb] border-b-2 border-[#2563eb] font-semibold'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-b-2 border-transparent hover:border-gray-200'
                          }`}
                        >
                          Activity
                        </button>
                      </nav>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-600">
                      {activeContentTab === 'step-analytics' && (
                        <StepAnalytics campaignId={campaignId || ''} timeRange={timeRange} />
                      )}
                      {activeContentTab === 'activity' && (
                        <ActivityFeed campaignId={campaignId || ''} timeRange={timeRange} />
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'analytics' && (
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4 pb-2">
                    Analytics updated 5 minutes ago
                  </div>
                )}
              </div>
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddLeadsModal && campaignId && (
        <AddLeadsModal
          campaignId={campaignId}
          onClose={() => setShowAddLeadsModal(false)}
          onSuccess={() => {
            fetchRecipients()
            setShowAddLeadsModal(false)
          }}
        />
      )}
    </DashboardLayout>
  )
}

