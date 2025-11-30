'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import { 
  Mail, 
  Plus, 
  Play,
  Pause,
  Square,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react'

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
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/campaigns')
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      console.error('Error loading campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (campaignId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      setActionLoading(campaignId)
      const response = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} campaign`)
      }

      await fetchCampaigns()
    } catch (err: any) {
      alert(err.message || `Failed to ${action} campaign`)
    } finally {
      setActionLoading(null)
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Campaigns</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Create and manage email campaigns and sequences
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/email/campaigns/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Campaigns Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create your first email campaign to start sending
            </p>
            <button
              onClick={() => router.push('/dashboard/email/campaigns/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {campaign.send_strategy === 'sequence' ? 'Sequence' : 'Single'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {campaign.total_recipients}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {campaign.sent_count} / {campaign.total_recipients}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/email/campaigns/${campaign.id}`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {campaign.status === 'running' && (
                            <button
                              onClick={() => handleAction(campaign.id, 'pause')}
                              disabled={actionLoading === campaign.id}
                              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 disabled:opacity-50"
                              title="Pause"
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Pause className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {campaign.status === 'paused' && (
                            <button
                              onClick={() => handleAction(campaign.id, 'resume')}
                              disabled={actionLoading === campaign.id}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 disabled:opacity-50"
                              title="Resume"
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {!['completed', 'cancelled'].includes(campaign.status) && (
                            <button
                              onClick={() => handleAction(campaign.id, 'cancel')}
                              disabled={actionLoading === campaign.id}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                              title="Cancel"
                            >
                              {actionLoading === campaign.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

