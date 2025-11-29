import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/crm/deals/analytics
 * 
 * Returns comprehensive analytics data for deals including:
 * - Deal win rate
 * - Total deals count
 * - Total amount won
 * - Weighted forecasted revenue
 * - Average sales cycle length
 * - Pipeline metrics
 * - Deal volume by stage
 * - Revenue trends
 * - Forecasted revenue by category
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role for queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get timeframe from query params (default: last 30 days)
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30d'
    
    // Calculate date range
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    }

    // Fetch all deals for the user
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dealsError) {
      console.error('Error fetching deals:', dealsError)
      return NextResponse.json(
        { error: 'Failed to fetch deals' },
        { status: 500 }
      )
    }

    const allDeals = deals || []

    // Filter deals by timeframe
    const currentPeriodDeals = allDeals.filter(deal => {
      const dealDate = new Date(deal.created_at)
      return dealDate >= startDate
    })

    const previousPeriodDeals = allDeals.filter(deal => {
      const dealDate = new Date(deal.created_at)
      return dealDate >= previousStartDate && dealDate < startDate
    })

    // Calculate metrics
    const totalDeals = currentPeriodDeals.length
    const previousTotalDeals = previousPeriodDeals.length

    const closedWonDeals = currentPeriodDeals.filter(d => d.stage === 'closed_won')
    const closedLostDeals = currentPeriodDeals.filter(d => d.stage === 'closed_lost')
    const previousClosedWonDeals = previousPeriodDeals.filter(d => d.stage === 'closed_won')
    const previousClosedLostDeals = previousPeriodDeals.filter(d => d.stage === 'closed_lost')

    const totalClosed = closedWonDeals.length + closedLostDeals.length
    const previousTotalClosed = previousClosedWonDeals.length + previousClosedLostDeals.length

    // Deal win rate
    const winRate = totalClosed > 0 ? (closedWonDeals.length / totalClosed) * 100 : 0
    const previousWinRate = previousTotalClosed > 0 ? (previousClosedWonDeals.length / previousTotalClosed) * 100 : 0

    // Total amount won
    const totalAmountWon = closedWonDeals.reduce((sum, deal) => {
      const value = parseFloat(deal.value?.toString() || '0') || 0
      return sum + value
    }, 0)
    const previousTotalAmountWon = previousClosedWonDeals.reduce((sum, deal) => {
      const value = parseFloat(deal.value?.toString() || '0') || 0
      return sum + value
    }, 0)

    // Weighted forecasted revenue (value * probability / 100)
    const weightedForecastedRevenue = allDeals
      .filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
      .reduce((sum, deal) => {
        const value = parseFloat(deal.value?.toString() || '0') || 0
        const probability = deal.probability || 0
        return sum + (value * probability / 100)
      }, 0)

    const previousWeightedForecastedRevenue = previousPeriodDeals
      .filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
      .reduce((sum, deal) => {
        const value = parseFloat(deal.value?.toString() || '0') || 0
        const probability = deal.probability || 0
        return sum + (value * probability / 100)
      }, 0)

    // Average sales cycle length (days from created_at to closed_date for closed deals)
    const closedDealsWithDates = closedWonDeals.filter(d => d.closed_date)
    const avgSalesCycle = closedDealsWithDates.length > 0
      ? closedDealsWithDates.reduce((sum, deal) => {
          const created = new Date(deal.created_at)
          const closed = new Date(deal.closed_date!)
          const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / closedDealsWithDates.length
      : 0

    const previousClosedDealsWithDates = previousClosedWonDeals.filter(d => d.closed_date)
    const previousAvgSalesCycle = previousClosedDealsWithDates.length > 0
      ? previousClosedDealsWithDates.reduce((sum, deal) => {
          const created = new Date(deal.created_at)
          const closed = new Date(deal.closed_date!)
          const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / previousClosedDealsWithDates.length
      : 0

    // Pipeline metrics
    const pipelineGenerated = allDeals.reduce((sum, deal) => {
      const value = parseFloat(deal.value?.toString() || '0') || 0
      return sum + value
    }, 0)

    const avgDealAmount = allDeals.length > 0
      ? allDeals.reduce((sum, deal) => {
          const value = parseFloat(deal.value?.toString() || '0') || 0
          return sum + value
        }, 0) / allDeals.length
      : 0

    // Deal volume by stage
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
    const dealVolumeByStage = stages.map(stage => {
      const count = allDeals.filter(d => d.stage === stage).length
      return { stage, count }
    })

    // Average sales cycle length by stage
    const avgSalesCycleByStage = stages.map(stage => {
      const stageDeals = allDeals.filter(d => d.stage === stage && d.closed_date)
      if (stageDeals.length === 0) return { stage, avgDays: 0 }
      
      const avgDays = stageDeals.reduce((sum, deal) => {
        const created = new Date(deal.created_at)
        const closed = new Date(deal.closed_date!)
        const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        return sum + days
      }, 0) / stageDeals.length
      
      return { stage, avgDays: Math.round(avgDays) }
    })

    // Revenue trends (weekly data for the last 12 weeks)
    const revenueTrends = []
    const weeks = 12
    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const weekDeals = allDeals.filter(deal => {
        const dealDate = new Date(deal.created_at)
        return dealDate >= weekStart && dealDate < weekEnd
      })

      const weekWeightedRevenue = weekDeals
        .filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
        .reduce((sum, deal) => {
          const value = parseFloat(deal.value?.toString() || '0') || 0
          const probability = deal.probability || 0
          return sum + (value * probability / 100)
        }, 0)

      const weekAmountWon = weekDeals
        .filter(d => d.stage === 'closed_won')
        .reduce((sum, deal) => {
          const value = parseFloat(deal.value?.toString() || '0') || 0
          return sum + value
        }, 0)

      const weekPipelineGenerated = weekDeals.reduce((sum, deal) => {
        const value = parseFloat(deal.value?.toString() || '0') || 0
        return sum + value
      }, 0)

      const weekTotalAmount = weekDeals.reduce((sum, deal) => {
        const value = parseFloat(deal.value?.toString() || '0') || 0
        return sum + value
      }, 0)

      revenueTrends.push({
        week: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        weightedForecastedRevenue: weekWeightedRevenue,
        amountWon: weekAmountWon,
        pipelineGenerated: weekPipelineGenerated,
        totalAmount: weekTotalAmount
      })
    }

    // Forecasted revenue by category (using pipeline as the category)
    const forecastedRevenueByCategory = {
      pipeline: weightedForecastedRevenue
    }

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    return NextResponse.json({
      stats: {
        winRate: {
          value: Math.round(winRate * 100) / 100,
          previous: Math.round(previousWinRate * 100) / 100,
          trend: calculateTrend(winRate, previousWinRate)
        },
        totalDeals: {
          value: totalDeals,
          previous: previousTotalDeals,
          trend: calculateTrend(totalDeals, previousTotalDeals)
        },
        totalAmountWon: {
          value: totalAmountWon,
          previous: previousTotalAmountWon,
          trend: calculateTrend(totalAmountWon, previousTotalAmountWon)
        },
        weightedForecastedRevenue: {
          value: weightedForecastedRevenue,
          previous: previousWeightedForecastedRevenue,
          trend: calculateTrend(weightedForecastedRevenue, previousWeightedForecastedRevenue)
        },
        avgSalesCycle: {
          value: Math.round(avgSalesCycle),
          previous: Math.round(previousAvgSalesCycle),
          trend: calculateTrend(avgSalesCycle, previousAvgSalesCycle)
        }
      },
      pipeline: {
        pipelineGenerated,
        weightedForecastedRevenue,
        totalAmountWon,
        avgDealAmount
      },
      dealVolumeByStage,
      avgSalesCycleByStage,
      revenueTrends,
      forecastedRevenueByCategory,
      timeframe
    })
  } catch (error: any) {
    console.error('API Error fetching deals analytics:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

