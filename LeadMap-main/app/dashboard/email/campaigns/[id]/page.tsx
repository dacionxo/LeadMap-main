'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/DashboardLayout'
import { 
  Mail, 
  Loader2,
  Play,
  Pause,
  Square,
  ArrowLeft
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  description?: string
  status: string
  send_strategy: string
  start_at?: string
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
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => {
      setCampaignId(id)
    })
  }, [params])

  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
    }
  }, [campaignId])

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

  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!campaign || !campaignId) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} campaign`)
      }

      await fetchCampaign()
    } catch (err: any) {
      alert(err.message || `Failed to ${action} campaign`)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      scheduled: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      running: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      paused: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      cancelled: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Campaign not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/email/campaigns')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
              {campaign.description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{campaign.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(campaign.status)}
            {campaign.status === 'running' && (
              <button
                onClick={() => handleAction('pause')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
            {campaign.status === 'paused' && (
              <button
                onClick={() => handleAction('resume')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            {!['completed', 'cancelled'].includes(campaign.status) && (
              <button
                onClick={() => handleAction('cancel')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Recipients</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {campaign.stats.total_recipients}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Sent</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {campaign.stats.total_sent}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {campaign.stats.completed}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {campaign.stats.total_failed}
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400">Mailbox</div>
              <div className="text-gray-900 dark:text-white font-medium">
                {campaign.mailbox?.display_name || campaign.mailbox?.email || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Type</div>
              <div className="text-gray-900 dark:text-white font-medium">
                {campaign.send_strategy === 'sequence' ? 'Sequence' : 'Single Email'}
              </div>
            </div>
            {campaign.start_at && (
              <div>
                <div className="text-gray-600 dark:text-gray-400">Start Date</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {new Date(campaign.start_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Steps</h2>
          <div className="space-y-3">
            {campaign.steps.map((step) => (
              <div key={step.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Step {step.step_number}
                  </div>
                  {step.delay_hours > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Delay: {step.delay_hours} hours
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {step.subject}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

