'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Plus, Search, Filter, LayoutGrid, Save, Calendar, Settings, MoreVertical, Upload, BarChart3, Zap, Mail, FileText, Edit, Trash2 } from 'lucide-react'
import OnboardingModal from '@/components/OnboardingModal'
import { EmailTemplate } from '@/types'
import { listEmailTemplates } from '@/lib/api'

interface EmailSequence {
  id: string
  name: string
  recipients: number
  opens: number
  clicks: number
  replies: number
  status: 'active' | 'paused' | 'draft'
  lastSent: string
}

// Mock data - replace with actual API call
const mockSequences: EmailSequence[] = [
  {
    id: '1',
    name: 'Follow-up Sequence',
    recipients: 150,
    opens: 120,
    clicks: 45,
    replies: 12,
    status: 'active',
    lastSent: '2 days ago'
  },
  {
    id: '2',
    name: 'Welcome Sequence',
    recipients: 89,
    opens: 67,
    clicks: 23,
    replies: 8,
    status: 'active',
    lastSent: '1 week ago'
  },
  {
    id: '3',
    name: 'Re-engagement Campaign',
    recipients: 234,
    opens: 156,
    clicks: 78,
    replies: 34,
    status: 'active',
    lastSent: '3 days ago'
  },
  {
    id: '4',
    name: 'Nurture Sequence',
    recipients: 445,
    opens: 389,
    clicks: 123,
    replies: 56,
    status: 'paused',
    lastSent: '2 weeks ago'
  },
  {
    id: '5',
    name: 'Onboarding Series',
    recipients: 67,
    opens: 52,
    clicks: 19,
    replies: 5,
    status: 'active',
    lastSent: '5 days ago'
  },
  {
    id: '6',
    name: 'Product Launch',
    recipients: 312,
    opens: 267,
    clicks: 134,
    replies: 67,
    status: 'active',
    lastSent: '1 day ago'
  },
  {
    id: '7',
    name: 'Holiday Campaign',
    recipients: 523,
    opens: 489,
    clicks: 234,
    replies: 89,
    status: 'active',
    lastSent: '4 days ago'
  },
  {
    id: '8',
    name: 'Win-back Sequence',
    recipients: 178,
    opens: 134,
    clicks: 67,
    replies: 23,
    status: 'draft',
    lastSent: 'Never'
  }
]

export default function SequencesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'analytics'>('overview')
  const [sequences] = useState<EmailSequence[]>(mockSequences)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates()
    }
  }, [activeTab])

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true)
      const { templates: fetchedTemplates } = await listEmailTemplates()
      setTemplates(fetchedTemplates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Sequences</h1>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button className="px-4 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create sequence
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Email Templates
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Analytics
              <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                New
              </span>
            </button>
          </div>
        </div>

        {/* Toolbar/Filter Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Left Side Controls */}
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <select className="appearance-none pl-8 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All Sequences</option>
                </select>
                <LayoutGrid className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Show Filters
              </button>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sequences"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save as new view
              </button>

              <div className="relative">
                <select className="appearance-none pl-8 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Created date</option>
                </select>
                <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button className="p-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {activeTab === 'overview' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg m-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sequence name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Recipients
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Opens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Replies
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last sent
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sequences.map((sequence) => (
                      <tr
                        key={sequence.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {sequence.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-300">
                            {sequence.recipients.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-300">
                            {sequence.opens.toLocaleString()}
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              ({formatPercentage(sequence.opens, sequence.recipients)})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-300">
                            {sequence.clicks.toLocaleString()}
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              ({formatPercentage(sequence.clicks, sequence.recipients)})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-300">
                            {sequence.replies.toLocaleString()}
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              ({formatPercentage(sequence.replies, sequence.recipients)})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              sequence.status
                            )}`}
                          >
                            {sequence.status.charAt(0).toUpperCase() + sequence.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {sequence.lastSent}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg m-6 overflow-hidden">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No email templates</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first email template to get started
                  </p>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    Create Template
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Template Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {templates.map((template) => (
                        <tr
                          key={template.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {template.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {template.body.substring(0, 100)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                              {template.category || 'General'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {template.created_at
                                ? new Date(template.created_at).toLocaleDateString()
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg m-6 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Analytics</h2>
              <p className="text-gray-600 dark:text-gray-400">Analytics view coming soon...</p>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal
        title="Email Sequences made easy"
        description="Set up automated email sequences and track engagement for your entire outreach campaign with LeadMap Email Sequences. Create multi-step sequences that nurture leads and drive conversions."
        features={[
          {
            icon: <BarChart3 className="w-5 h-5" />,
            text: "Get actionable insights on opens, clicks, and replies to optimize your sequences"
          },
          {
            icon: <Zap className="w-5 h-5" />,
            text: "Use seamlessly with other LeadMap tools to automate your sales workflow"
          },
          {
            icon: <Mail className="w-5 h-5" />,
            text: "Automate follow-ups and sequence scheduling to reduce manual tasks"
          }
        ]}
        illustration={
          <div className="mt-8 flex flex-col items-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 mb-4 relative">
              <div className="bg-white rounded-full p-4">
                <div className="text-center">
                  <Mail className="w-8 h-8 text-green-600 mx-auto" />
                  <div className="text-xs text-gray-600 mt-2">Sequences active</div>
                </div>
              </div>
              {/* Decorative stars */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-800" />
              </div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-yellow-800" />
              </div>
            </div>

            {/* Email metrics icons */}
            <div className="flex items-center space-x-3 mt-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                Opens
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                Clicks
              </div>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                Replies
              </div>
            </div>
          </div>
        }
        onBeginSetup={() => {
          // You can add logic to open create sequence modal here
          console.log('Begin sequence setup')
        }}
        storageKey="email-sequences-onboarding-seen"
      />
    </DashboardLayout>
  )
}
