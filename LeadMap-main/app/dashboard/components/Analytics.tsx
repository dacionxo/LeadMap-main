'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TrendingUp, TrendingDown, Calendar, RefreshCw } from 'lucide-react'

interface AnalyticsData {
  totalLeads: number
  expiredLeads: number
  enrichedLeads: number
  avgConfidence: number
  leadsThisWeek: number
  leadsLastWeek: number
}

export default function Analytics() {
  const supabase = createClientComponentClient()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-refresh every 5 minutes
  const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000

  useEffect(() => {
    fetchAnalytics()
    
    // Set up auto-refresh
    autoRefreshIntervalRef.current = setInterval(() => {
      fetchAnalytics(true) // Silent refresh
    }, AUTO_REFRESH_INTERVAL)
    
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set up real-time subscription for listings
  useEffect(() => {
    const channel = supabase
      .channel('analytics-listings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings'
        },
        () => {
          // Refresh data when listings change
          fetchAnalytics(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const fetchAnalytics = async (silent = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    
    try {
      if (!silent) {
        setLoading(true)
        setRefreshing(true)
      }
      setError(null)

      // Get date ranges
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      // Fetch all leads with retry logic
      let allLeads: any[] = []
      let fetchError: any = null
      let retries = 3
      
      while (retries > 0) {
        const { data, error } = await supabase
          .from('listings')
          .select('listing_id, status, active, agent_email, agent_phone, agent_name, ai_investment_score, created_at, updated_at')
          .order('created_at', { ascending: false })
        
        if (!error) {
          allLeads = data || []
          break
        }
        fetchError = error
        retries--
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
        }
      }

      if (fetchError) throw fetchError

      const total = allLeads?.length || 0
      const expired = allLeads?.filter(l => 
        l.status && (l.status.toLowerCase().includes('expired') || 
        l.status.toLowerCase().includes('sold') || 
        l.status.toLowerCase().includes('off market'))
      ).length || 0
      const enriched = allLeads?.filter(l => 
        (l.ai_investment_score !== null && l.ai_investment_score !== undefined) ||
        l.agent_email || l.agent_phone || l.agent_name
      ).length || 0

      // Calculate average AI investment score with validation
      const enrichedLeads = allLeads?.filter(l => l.ai_investment_score !== null && l.ai_investment_score !== undefined) || []
      const avgScore = enrichedLeads.length > 0
        ? Math.round(
            enrichedLeads.reduce((sum, l) => {
              const score = typeof l.ai_investment_score === 'number' 
                ? l.ai_investment_score 
                : parseFloat(l.ai_investment_score?.toString() || '0') || 0
              return sum + score
            }, 0) / enrichedLeads.length
          )
        : 0

      // Leads this week
      const leadsThisWeek = allLeads?.filter(l => {
        const created = new Date(l.created_at)
        return created >= weekAgo && created <= now
      }).length || 0

      // Leads last week
      const leadsLastWeek = allLeads?.filter(l => {
        const created = new Date(l.created_at)
        return created >= twoWeeksAgo && created < weekAgo
      }).length || 0

      setData({
        totalLeads: total,
        expiredLeads: expired,
        enrichedLeads: enriched,
        avgConfidence: avgScore,
        leadsThisWeek,
        leadsLastWeek
      })
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      setError(error?.message || 'Failed to load analytics data. Please try refreshing.')
    } finally {
      setLoading(false)
      setRefreshing(false)
      fetchingRef.current = false
    }
  }

  const handleManualRefresh = () => {
    fetchAnalytics(false)
  }

  if (loading && !data) {
    return (
      <div className="p-8 bg-gray-800 rounded-xl border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-32" />
          <div className="h-8 bg-gray-700 rounded w-24" />
        </div>
      </div>
    )
  }

  if (!data && !loading) {
    return (
      <div className="p-8 bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400">No analytics data available</p>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-800 rounded text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    )
  }

  if (!data) return null

  const weekChange = data.leadsLastWeek > 0
    ? Math.round(((data.leadsThisWeek - data.leadsLastWeek) / data.leadsLastWeek) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Analytics</h2>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing || loading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded text-sm text-red-400">
          {error}
        </div>
      )}
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Leads</span>
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{data.totalLeads}</div>
        </div>

        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Expired</span>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{data.expiredLeads}</div>
        </div>

        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Enriched</span>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{data.enrichedLeads}</div>
        </div>

        <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Avg Confidence</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{data.avgConfidence}%</div>
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Trend</h3>
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">This Week</span>
              <span className="text-sm font-medium text-white">{data.leadsThisWeek}</span>
            </div>
            <div className="h-32 bg-gray-700 rounded-lg flex items-end">
              <div
                className="w-full bg-blue-600 rounded-lg transition-all duration-300"
                style={{ height: `${Math.max((data.leadsThisWeek / Math.max(data.leadsThisWeek, data.leadsLastWeek, 1)) * 100, 10)}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Last Week</span>
              <span className="text-sm font-medium text-white">{data.leadsLastWeek}</span>
            </div>
            <div className="h-32 bg-gray-700 rounded-lg flex items-end">
              <div
                className="w-full bg-gray-600 rounded-lg transition-all duration-300"
                style={{ height: `${Math.max((data.leadsLastWeek / Math.max(data.leadsThisWeek, data.leadsLastWeek, 1)) * 100, 10)}%` }}
              />
            </div>
          </div>
        </div>
        {weekChange !== 0 && (
          <div className="mt-4 flex items-center space-x-2">
            {weekChange > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${weekChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {Math.abs(weekChange)}% {weekChange > 0 ? 'increase' : 'decrease'} from last week
            </span>
          </div>
        )}
      </div>
    </div>
  )
}


