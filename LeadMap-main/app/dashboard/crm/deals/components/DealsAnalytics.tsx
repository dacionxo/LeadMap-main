'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { TrendingUp, TrendingDown, Filter, MoreVertical, Loader2, Sparkles } from 'lucide-react'

interface DealsAnalyticsProps {
  timeframe?: string
  onTimeframeChange?: (timeframe: string) => void
}

interface AnalyticsData {
  stats: {
    winRate: { value: number; previous: number; trend: number }
    totalDeals: { value: number; previous: number; trend: number }
    totalAmountWon: { value: number; previous: number; trend: number }
    weightedForecastedRevenue: { value: number; previous: number; trend: number }
    avgSalesCycle: { value: number; previous: number; trend: number }
  }
  pipeline: {
    pipelineGenerated: number
    weightedForecastedRevenue: number
    totalAmountWon: number
    avgDealAmount: number
  }
  dealVolumeByStage: Array<{ stage: string; count: number }>
  avgSalesCycleByStage: Array<{ stage: string; avgDays: number }>
  revenueTrends: Array<{
    week: string
    weekEnd: string
    weightedForecastedRevenue: number
    amountWon: number
    pipelineGenerated: number
    totalAmount: number
  }>
  forecastedRevenueByCategory: {
    pipeline: number
  }
}

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userEmail: string
  totalDeals: number
  dealsClosed: number
  dealsWon: number
  totalWeightedForecastedRevenue: number
  winRate: number
  avgSalesCycleDays: number
  totalAmountWon: number
}

interface ActivityData {
  userId: string
  userName: string
  activitiesCount: number
  lastActivityDate: string
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  activityByRep: ActivityData[]
}

const STAGE_LABELS: Record<string, string> = {
  'new': 'Lead',
  'contacted': 'Sales Qualified',
  'qualified': 'Meeting Booked',
  'proposal': 'Negotiation',
  'negotiation': 'Contract Sent',
  'closed_won': 'Closed Won',
  'closed_lost': 'Closed Lost'
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
  purple: '#9333ea'
}

// Compact week formatter for Revenue Trends
const formatWeekCompact = (weekStart: string, weekEnd: string) => {
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`
}

export default function DealsAnalytics({ timeframe = '30d', onTimeframeChange }: DealsAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)

  useEffect(() => {
    fetchAnalytics()
    fetchLeaderboardData()
  }, [selectedTimeframe])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/crm/deals/analytics?timeframe=${selectedTimeframe}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      } else {
        console.error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaderboardData = async () => {
    try {
      setLeaderboardLoading(true)
      const response = await fetch('/api/crm/deals/analytics/leaderboard', {
        credentials: 'include',
      })
      
      if (response.ok) {
        const leaderboardResponse: LeaderboardResponse = await response.json()
        setLeaderboardData(leaderboardResponse.leaderboard || [])
        setActivityData(leaderboardResponse.activityByRep || [])
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const formatNumber = (value: number) => {
    return value.toLocaleString()
  }

  const getPreviousPeriodLabel = () => {
    const now = new Date()
    let daysAgo = 30
    switch (selectedTimeframe) {
      case '7d': daysAgo = 7; break
      case '30d': daysAgo = 30; break
      case '90d': daysAgo = 90; break
      case '1y': daysAgo = 365; break
    }
    const previousDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[previousDate.getMonth()]} ${previousDate.getDate()}`
  }

  const StatCard = ({ 
    label, 
    value, 
    previous, 
    trend, 
    format = (v: number) => v.toString(),
    icon: Icon
  }: { 
    label: string
    value: number
    previous: number
    trend: number
    format?: (v: number) => string
    icon?: any
  }) => {
    const isPositive = trend >= 0
    const TrendIcon = isPositive ? TrendingUp : TrendingDown
    const trendColor = isPositive ? '#10b981' : '#ef4444'

    return (
      <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {label}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {format(value)}
            </div>
          </div>
          {Icon && (
            <div className="ml-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon size={12} />
            <span className="font-semibold">{Math.abs(trend).toFixed(1)}%</span>
          </div>
          <span className="text-gray-500 dark:text-gray-400">From {getPreviousPeriodLabel()}</span>
        </div>
      </div>
    )
  }

  // Memoize chart data for performance
  const chartData = useMemo(() => {
    if (!data) return { dealVolumeData: [], salesCycleData: [], revenueTrendsData: [], pipelineData: [] }

    const dealVolumeData = data.dealVolumeByStage.map(item => ({
      stage: STAGE_LABELS[item.stage] || item.stage,
      count: item.count
    }))

    const salesCycleData = data.avgSalesCycleByStage.map(item => ({
      stage: STAGE_LABELS[item.stage] || item.stage,
      avgDays: item.avgDays
    }))

    // Compact week labels for Revenue Trends
    const revenueTrendsData = data.revenueTrends.map(item => ({
      week: formatWeekCompact(item.week, item.weekEnd),
      weekShort: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weightedForecastedRevenue: item.weightedForecastedRevenue,
      amountWon: item.amountWon,
      pipelineGenerated: item.pipelineGenerated,
      totalAmount: item.totalAmount
    }))

    const pipelineData = [
      { metric: '$ Deal pipeline generated', value: data.pipeline.pipelineGenerated },
      { metric: '$ Deal total weighted forecasted revenue', value: data.pipeline.weightedForecastedRevenue },
      { metric: '$ Deal total amount won', value: data.pipeline.totalAmountWon },
      { metric: '$ Deals avg. amount', value: data.pipeline.avgDealAmount }
    ]

    return { dealVolumeData, salesCycleData, revenueTrendsData, pipelineData }
  }, [data])

  // Prepare chart data for "Deal Amount Won by Rep"
  const repChartData = useMemo(() => {
    return leaderboardData
      .filter(entry => entry.totalAmountWon > 0)
      .map(entry => ({
        name: entry.userName,
        amount: entry.totalAmountWon,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [leaderboardData])

  if (loading || leaderboardLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 min-h-[400px]">
        <div className="text-center">
          <div className="text-gray-400 dark:text-gray-600 mb-2">
            <Sparkles className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 p-6 pb-12 space-y-6">
      {/* Header Controls - Polished */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => {
              setSelectedTimeframe(e.target.value)
              onTimeframeChange?.(e.target.value)
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 flex items-center gap-2">
            <Filter size={16} />
            Add filter
          </button>
        </div>
      </div>

      {/* Stats Cards - Enhanced Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="% Deal win rate"
          value={data.stats.winRate.value}
          previous={data.stats.winRate.previous}
          trend={data.stats.winRate.trend}
          format={(v) => `${v.toFixed(1)}%`}
        />
        <StatCard
          label="# Deals"
          value={data.stats.totalDeals.value}
          previous={data.stats.totalDeals.previous}
          trend={data.stats.totalDeals.trend}
        />
        <StatCard
          label="$ Deal total amount won"
          value={data.stats.totalAmountWon.value}
          previous={data.stats.totalAmountWon.previous}
          trend={data.stats.totalAmountWon.trend}
          format={formatCurrency}
        />
        <StatCard
          label="$ Deal total weighted forecasted revenue"
          value={data.stats.weightedForecastedRevenue.value}
          previous={data.stats.weightedForecastedRevenue.previous}
          trend={data.stats.weightedForecastedRevenue.trend}
          format={formatCurrency}
        />
        <StatCard
          label="Deal avg. sales cycle in days"
          value={data.stats.avgSalesCycle.value}
          previous={data.stats.avgSalesCycle.previous}
          trend={data.stats.avgSalesCycle.trend}
        />
      </div>

      {/* Charts Grid - Enhanced Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Chart */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pipeline</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData.pipelineData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis dataKey="metric" type="category" width={180} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="value" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deal Volume by Stages */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Deal Volume by Stages</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData.dealVolumeData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="stage" 
                  angle={-35} 
                  textAnchor="end" 
                  height={70}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="count" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Sales Cycle Length by Stage */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Average Sales Cycle Length by Stage</h3>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart 
                data={chartData.salesCycleData} 
                layout="vertical"
                margin={{ top: 5, right: 20, left: 130, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  label={{ 
                    value: 'Average Sales Cycle Length', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 }
                  }}
                />
                <YAxis 
                  dataKey="stage" 
                  type="category" 
                  width={120}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  label={{ 
                    value: 'Deal Stage', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 }
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} days`, 'Average Sales Cycle']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="avgDays" 
                  fill={COLORS.success}
                  radius={[0, 6, 6, 0]}
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecasted Revenue by Category */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Forecasted Revenue by Category</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[{ name: 'Pipeline', value: data.forecastedRevenueByCategory.pipeline }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  fill={COLORS.primary}
                  dataKey="value"
                  label={({ value }) => formatCurrency(value)}
                >
                  <Cell fill={COLORS.primary} />
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section - Leaderboard Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Amount Won by Rep */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Deal Amount Won by Rep</h3>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            {repChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-500 dark:text-gray-400">
                <div className="text-sm mb-2">No data available</div>
                <div className="text-xs">Deals won data will appear here</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={repChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#6b7280', fontSize: 11 }} 
                    label={{ 
                      value: '$ Deal total amount won', 
                      position: 'insideBottom', 
                      offset: -5, 
                      style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 } 
                    }} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: '#6b7280', fontSize: 11 }} 
                    width={100}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="amount" fill={COLORS.primary} radius={[0, 6, 6, 0]} animationDuration={1200} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity by Rep */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Activity by Rep</h3>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            {activityData.length === 0 || activityData.every(a => a.activitiesCount === 0) ? (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-500 dark:text-gray-400">
                <div className="mb-4">
                  <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-sm font-medium">No data yet</div>
              </div>
            ) : (
              <div className="space-y-3">
                {activityData.map((activity) => (
                  <div
                    key={activity.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-sm group"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{activity.userName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Last activity: {new Date(activity.lastActivityDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                      {formatNumber(activity.activitiesCount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Trends - Compact and Polished */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Revenue Trends</h3>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData.revenueTrendsData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
              <defs>
                <linearGradient id="colorWeighted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="weekShort" 
                angle={-35} 
                textAnchor="end" 
                height={70}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                label={{ 
                  value: 'Revenue', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 }
                }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'weightedForecastedRevenue' ? 'Weighted Forecasted' :
                  name === 'amountWon' ? 'Amount Won' :
                  name === 'pipelineGenerated' ? 'Pipeline Generated' :
                  name === 'totalAmount' ? 'Total Amount' : name
                ]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                labelStyle={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }}
                iconType="line"
                iconSize={12}
              />
              <Area
                type="monotone"
                dataKey="weightedForecastedRevenue"
                stroke={COLORS.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorWeighted)"
                name="Weighted Forecasted"
              />
              <Line
                type="monotone"
                dataKey="amountWon"
                stroke={COLORS.gray}
                strokeWidth={2}
                dot={false}
                name="Amount Won"
              />
              <Line
                type="monotone"
                dataKey="pipelineGenerated"
                stroke={COLORS.success}
                strokeWidth={2}
                dot={false}
                name="Pipeline Generated"
              />
              <Line
                type="monotone"
                dataKey="totalAmount"
                stroke={COLORS.purple}
                strokeWidth={2}
                dot={false}
                name="Total Amount"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deals Leaderboard Table - Polished Design */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Deals Leaderboard</h3>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">USER</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"># DEALS</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"># DEALS CLOSED</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"># DEALS WON</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">$ DEAL TOTAL WEIGHTED FORECASTED REVENUE</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">% DEAL WIN RATE</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">DEAL AVG. SALES CYCLE IN DAYS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboardData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-sm">No data available</div>
                      <div className="text-xs text-gray-400">Leaderboard data will appear here</div>
                    </div>
                  </td>
                </tr>
              ) : (
                leaderboardData.map((entry, index) => (
                  <tr 
                    key={entry.userId} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 w-6">{entry.rank}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.userName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{entry.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(entry.totalDeals)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(entry.dealsClosed)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(entry.dealsWon)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(entry.totalWeightedForecastedRevenue)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{entry.winRate > 0 ? `${entry.winRate.toFixed(1)}%` : '?%'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{entry.avgSalesCycleDays > 0 ? entry.avgSalesCycleDays.toFixed(2) : '0.00'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
