'use client'

import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { 
  Star, 
  ExternalLink, 
  LayoutGrid, 
  BarChart3, 
  Trophy, 
  ChevronDown,
  ChevronRight
} from 'lucide-react'

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'dashboards' | 'reports'>('overview')
  const [recentTab, setRecentTab] = useState<'dashboards' | 'reports' | 'goals'>('dashboards')

  // Mock data for charts
  const emailData = [
    { name: 'Alex Thompson', scheduled: 850, sent: 720, calls: 45 },
    { name: 'Maria Rodriguez', scheduled: 680, sent: 590, calls: 38 },
    { name: 'James Wilson', scheduled: 620, sent: 540, calls: 42 },
    { name: 'Jeph Francois', scheduled: 580, sent: 510, calls: 35 },
    { name: 'Michael O\'Connor', scheduled: 520, sent: 480, calls: 30 },
    { name: 'Emma Parker', scheduled: 480, sent: 420, calls: 28 },
    { name: 'Sarah Chen', scheduled: 420, sent: 380, calls: 25 },
    { name: 'Ankur Bansal', scheduled: 380, sent: 340, calls: 22 },
    { name: 'Wojciech Niemkowski', scheduled: 320, sent: 290, calls: 20 },
  ]

  const callsData = [
    { name: 'Alex Thompson', value: 45, color: '#3b82f6' },
    { name: 'Tolga Ozkan', value: 38, color: '#1e40af' },
    { name: 'James Wilson', value: 42, color: '#10b981' },
    { name: 'Jeph Francois', value: 35, color: '#8b5cf6' },
    { name: 'Michael O\'Connor', value: 30, color: '#14b8a6' },
    { name: 'Emma Parker', value: 28, color: '#6b7280' },
    { name: 'Sarah Chen', value: 25, color: '#9ca3af' },
    { name: 'Wojciech Niemkowski', value: 20, color: '#374151' },
  ]

  const recentItems = [
    'Call Engagement Performance',
    'Meetings Metrics',
    'Sales Development Activity',
    'Deliverability Rates & Score'
  ]

  const maxValue = Math.max(...emailData.map(d => Math.max(d.scheduled, d.sent, d.calls)))

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-2rem)] bg-white dark:bg-gray-900">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Star className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <ExternalLink className="w-5 h-5" />
              </button>
              <div className="relative">
                <button className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium flex items-center gap-2">
                  Create
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
            <div className="p-6">
              {/* Dashboard Selector */}
              <div className="mb-6">
                <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option>Select a dashboard</option>
                </select>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Emails sent by Sales Rep - Horizontal Bar Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Emails sent by Sales Rep
                  </h3>
                  
                  {/* Chart */}
                  <div className="space-y-4">
                    {emailData.map((rep, index) => (
                      <div key={index} className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {rep.name}
                        </div>
                        <div className="space-y-1.5">
                          {/* Scheduled */}
                          <div className="flex items-center gap-2">
                            <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
                              Scheduled
                            </div>
                            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded relative">
                              <div
                                className="h-full bg-blue-500 rounded"
                                style={{ width: `${(rep.scheduled / maxValue) * 100}%` }}
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-700 dark:text-gray-300">
                                {rep.scheduled}
                              </span>
                            </div>
                          </div>
                          {/* Sent */}
                          <div className="flex items-center gap-2">
                            <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
                              Sent
                            </div>
                            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded relative">
                              <div
                                className="h-full bg-green-500 rounded"
                                style={{ width: `${(rep.sent / maxValue) * 100}%` }}
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-700 dark:text-gray-300">
                                {rep.sent}
                              </span>
                            </div>
                          </div>
                          {/* Calls */}
                          <div className="flex items-center gap-2">
                            <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
                              Calls
                            </div>
                            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded relative">
                              <div
                                className="h-full bg-cyan-400 rounded"
                                style={{ width: `${(rep.calls / maxValue) * 100}%` }}
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-700 dark:text-gray-300">
                                {rep.calls}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400"># Emails Scheduled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400"># Emails Sent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-cyan-400 rounded"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400"># Calls Logged</span>
                    </div>
                  </div>
                </div>

                {/* Calls made by Sales Rep - Donut Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Calls made by Sales Rep
                  </h3>
                  
                  {/* Donut Chart */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="20"
                          className="dark:stroke-gray-700"
                        />
                        {(() => {
                          let currentAngle = 0
                          const total = callsData.reduce((sum, d) => sum + d.value, 0)
                          return callsData.map((item, index) => {
                            const percentage = (item.value / total) * 100
                            const angle = (percentage / 100) * 360
                            const startAngle = currentAngle
                            currentAngle += angle
                            
                            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                            const x2 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180)
                            const y2 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180)
                            const largeArc = angle > 180 ? 1 : 0
                            
                            return (
                              <path
                                key={index}
                                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={item.color}
                                stroke="white"
                                strokeWidth="2"
                                className="dark:stroke-gray-800"
                              />
                            )
                          })
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">50</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2">
                    {callsData.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                          {item.name}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Promotional Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Sell smarter with advanced analytics.
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                  Take the guesswork out of sales. Use data-driven insights and reporting to understand your performance, identify the biggest bottlenecks in your funnel, and close more deals.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium">
                    Learn more
                  </button>
                  <button className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg transition-colors font-medium">
                    Try Analytics now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('dashboards')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'dashboards'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Dashboards
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reports'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Reports
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-2 border-b border-gray-200 dark:border-gray-700">
            <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Create dashboard
            </button>
            <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Create report
            </button>
            <button className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Create goal
            </button>
          </div>

          {/* Recent Section */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setRecentTab('dashboards')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    recentTab === 'dashboards'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Dashboards
                </button>
                <button
                  onClick={() => setRecentTab('reports')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    recentTab === 'reports'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Reports
                </button>
                <button
                  onClick={() => setRecentTab('goals')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    recentTab === 'goals'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Goals
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {recentItems.map((item, index) => (
                <button
                  key={index}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <LayoutGrid className="w-4 h-4 text-gray-400" />
                  <span className="flex-1">{item}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
