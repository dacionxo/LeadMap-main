'use client'

import { useState, useEffect } from 'react'
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
import { TrendingUp, TrendingDown, Filter, MoreVertical, Loader2 } from 'lucide-react'

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart)
    const end = new Date(weekEnd)
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
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
    format = (v: number) => v.toString() 
  }: { 
    label: string
    value: number
    previous: number
    trend: number
    format?: (v: number) => string
  }) => {
    const isPositive = trend >= 0
    const TrendIcon = isPositive ? TrendingUp : TrendingDown
    const trendColor = isPositive ? '#10b981' : '#ef4444'

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          {label}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {format(value)}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <TrendIcon size={12} className={isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
          <span className={`font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-gray-500 dark:text-gray-400">from {getPreviousPeriodLabel()}</span>
        </div>
      </div>
    )
  }

  if (loading || leaderboardLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">No analytics data available</p>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const dealVolumeData = data.dealVolumeByStage.map(item => ({
    stage: STAGE_LABELS[item.stage] || item.stage,
    count: item.count
  }))

  const salesCycleData = data.avgSalesCycleByStage.map(item => ({
    stage: STAGE_LABELS[item.stage] || item.stage,
    avgDays: item.avgDays
  }))

  // Shorten week labels for Revenue Trends
  const revenueTrendsData = data.revenueTrends.map(item => ({
    week: formatDate(item.week),
    weekFull: formatWeekRange(item.week, item.weekEnd),
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

  // Prepare chart data for "Deal Amount Won by Rep"
  const chartData = leaderboardData
    .filter(entry => entry.totalAmountWon > 0)
    .map(entry => ({
      name: entry.userName,
      amount: entry.totalAmountWon,
    }))
    .sort((a, b) => b.amount - a.amount)

  const formatNumber = (value: number) => {
    return value.toLocaleString()
  }

  // Custom legend formatter for shorter labels
  const renderCustomLegend = (props: any) => {
    const { payload } = props
    const shortLabels: Record<string, string> = {
      'weightedForecastedRevenue': 'Forecasted Revenue',
      'amountWon': 'Amount Won',
      'pipelineGenerated': 'Pipeline Generated',
      'totalAmount': 'Total Amount'
    }
    
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {shortLabels[entry.dataKey] || entry.name}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full max-w-full box-border pb-12 bg-gray-50 dark:bg-gray-900 min-h-full">
      {/* Header Controls - Polished */}
      <div className="flex items-center justify-between mb-6 w-full">
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => {
              setSelectedTimeframe(e.target.value)
              onTimeframeChange?.(e.target.value)
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all flex items-center gap-2">
            <Filter size={16} />
            Add filter
          </button>
        </div>
      </div>

      {/* Stats Cards - Enhanced */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 w-full">
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

      {/* Charts Grid - Polished Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 w-full">
        {/* Pipeline Chart */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Pipeline
            </h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deal Volume by Stages */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Deal Volume by Stages
            </h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dealVolumeData} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="stage" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
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
                <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Sales Cycle Length by Stage */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Average Sales Cycle Length by Stage
            </h3>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={salesCycleData} 
                layout="vertical"
                margin={{ top: 5, right: 20, left: 140, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  label={{ 
                    value: 'Average Sales Cycle Length', 
                    position: 'insideBottom', 
                    offset: -5,
                    style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 }
                  }}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  dataKey="stage" 
                  type="category" 
                  width={130}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={{ stroke: '#e5e7eb' }}
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
                  labelStyle={{ color: '#374151', fontWeight: 600, fontSize: 12 }}
                />
                <Bar 
                  dataKey="avgDays" 
                  fill={COLORS.success}
                  radius={[0, 4, 4, 0]}
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecasted Revenue by Category */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Forecasted Revenue by Category
            </h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[{ name: 'Pipeline', value: data.forecastedRevenueByCategory.pipeline }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
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
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section - Leaderboard Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 w-full">
        {/* Deal Amount Won by Rep */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Deal Amount Won by Rep</h2>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
          <div className="p-6">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="text-sm mb-2">No data available</div>
                <div className="text-xs">Deals won data will appear here</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#6b7280', fontSize: 11 }} 
                    axisLine={{ stroke: '#e5e7eb' }} 
                    tickLine={{ stroke: '#e5e7eb' }} 
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
                    axisLine={{ stroke: '#e5e7eb' }} 
                    tickLine={{ stroke: '#e5e7eb' }} 
                    width={120} 
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
                    labelStyle={{ color: '#374151', fontWeight: 600, fontSize: 12 }} 
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} animationDuration={1200} animationBegin={0} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity by Rep */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Activity by Rep</h2>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
          <div className="p-6">
            {activityData.length === 0 || activityData.every(a => a.activitiesCount === 0) ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
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
                  <div key={activity.userId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{activity.userName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Last activity: {new Date(activity.lastActivityDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">{formatNumber(activity.activitiesCount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Trends - Compact and Polished */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden mb-6 w-full">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Revenue Trends
          </h3>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart 
              data={revenueTrendsData} 
              margin={{ top: 10, right: 20, bottom: 80, left: 0 }}
            >
              <defs>
                <linearGradient id="colorWeighted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="week" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                interval={0}
              />
              <YAxis 
                label={{ 
                  value: 'Revenue (M)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 11 }
                }}
                tick={{ fill: '#6b7280', fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const shortLabels: Record<string, string> = {
                    'weightedForecastedRevenue': 'Forecasted Revenue',
                    'amountWon': 'Amount Won',
                    'pipelineGenerated': 'Pipeline Generated',
                    'totalAmount': 'Total Amount'
                  }
                  return [formatCurrency(value), shortLabels[name] || name]
                }}
                labelFormatter={(label) => {
                  const item = revenueTrendsData.find(d => d.week === label)
                  return item?.weekFull || label
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600, fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="weightedForecastedRevenue"
                stroke={COLORS.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorWeighted)"
                name="weightedForecastedRevenue"
              />
              <Line
                type="monotone"
                dataKey="amountWon"
                stroke={COLORS.gray}
                strokeWidth={2}
                dot={false}
                name="amountWon"
              />
              <Line
                type="monotone"
                dataKey="pipelineGenerated"
                stroke={COLORS.success}
                strokeWidth={2}
                dot={false}
                name="pipelineGenerated"
              />
              <Line
                type="monotone"
                dataKey="totalAmount"
                stroke={COLORS.purple}
                strokeWidth={2}
                dot={false}
                name="totalAmount"
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Custom Compact Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Forecasted Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Amount Won</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Pipeline Generated</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Total Amount</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deals Leaderboard Table - Polished */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden mb-6 w-full">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Deals Leaderboard
          </h2>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">USER</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"># DEALS</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"># DEALS CLOSED</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"># DEALS WON</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">$ DEAL TOTAL WEIGHTED FORECASTED REVENUE</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">% DEAL WIN RATE</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">DEAL AVG. SALES CYCLE IN DAYS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboardData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No data available</td>
                </tr>
              ) : (
                leaderboardData.map((entry) => (
                  <tr 
                    key={entry.userId} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-6">{entry.rank}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{entry.userName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{entry.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(entry.totalDeals)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(entry.dealsClosed)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatNumber(entry.dealsWon)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(entry.totalWeightedForecastedRevenue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{entry.winRate > 0 ? `${entry.winRate.toFixed(1)}%` : '?%'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">{entry.avgSalesCycleDays > 0 ? entry.avgSalesCycleDays.toFixed(2) : '0.00'}</td>
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
