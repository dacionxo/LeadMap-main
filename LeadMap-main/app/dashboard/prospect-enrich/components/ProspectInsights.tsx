'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
  DollarSign,
  MapPin,
  Clock,
  Zap,
  BarChart3,
  Sparkles
} from 'lucide-react'

interface Listing {
  listing_id: string
  street?: string | null
  city?: string | null
  state?: string | null
  list_price?: number | null
  beds?: number | null
  full_baths?: number | null
  sqft?: number | null
  year_built?: number | null
  status?: string | null
  active?: boolean
  ai_investment_score?: number | null
  agent_email?: string | null
  agent_phone?: string | null
  agent_name?: string | null
  created_at?: string
  list_price_min?: number | null
  price_per_sqft?: number | null
}

interface ProspectInsightsProps {
  listings: Listing[]
}

interface Insight {
  id: string
  type: 'opportunity' | 'warning' | 'info' | 'success'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  metric?: string
  action?: string
  icon: any
  data?: any
}

export default function ProspectInsights({ listings }: ProspectInsightsProps) {
  const insights = useMemo(() => {
    const insightsList: Insight[] = []

    // Calculate key metrics
    const total = listings.length
    const totalValue = listings.reduce((sum, l) => sum + (l.list_price || 0), 0)
    const avgPrice = total > 0 ? totalValue / total : 0
    const enrichedCount = listings.filter(l => 
      l.agent_email || l.agent_phone || l.agent_name || l.ai_investment_score
    ).length
    const highScoreLeads = listings.filter(l => (l.ai_investment_score || 0) >= 70)
    const expiredLeads = listings.filter(l => 
      l.status && (l.status.toLowerCase().includes('expired') || l.status.toLowerCase().includes('sold'))
    )
    const highValueLeads = listings.filter(l => (l.list_price || 0) >= 500000)
    const priceDropLeads = listings.filter(l => {
      if (!l.list_price_min || !l.list_price) return false
      const drop = ((l.list_price_min - l.list_price) / l.list_price_min) * 100
      return drop > 5
    })

    // Time-based analysis
    const now = Date.now()
    const last7Days = listings.filter(l => {
      if (!l.created_at) return false
      return (now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7
    }).length
    const previous7Days = listings.filter(l => {
      if (!l.created_at) return false
      const daysAgo = (now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo > 7 && daysAgo <= 14
    }).length
    const growthRate = previous7Days > 0 ? ((last7Days - previous7Days) / previous7Days) * 100 : 0

    // Geographic analysis
    const stateCounts: Record<string, number> = {}
    listings.forEach(l => {
      if (l.state) stateCounts[l.state] = (stateCounts[l.state] || 0) + 1
    })
    const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]
    const stateConcentration = topState ? (topState[1] / total) * 100 : 0

    // Price per sqft analysis
    const pricePerSqftLeads = listings.filter(l => l.price_per_sqft && l.price_per_sqft < 100)
    const avgPricePerSqft = listings
      .filter(l => l.price_per_sqft)
      .reduce((sum, l) => sum + (l.price_per_sqft || 0), 0) / listings.filter(l => l.price_per_sqft).length || 0

    // 1. High-Score Opportunities
    if (highScoreLeads.length > 0) {
      insightsList.push({
        id: 'high-score',
        type: 'opportunity',
        priority: 'high',
        title: 'High-Score Prospects Available',
        description: `${highScoreLeads.length} prospects with AI investment scores ≥70. These represent the highest quality leads in your pipeline.`,
        metric: `Avg Score: ${(highScoreLeads.reduce((sum, l) => sum + (l.ai_investment_score || 0), 0) / highScoreLeads.length).toFixed(1)}`,
        action: 'Prioritize outreach to these leads',
        icon: Target,
        data: highScoreLeads.slice(0, 5)
      })
    }

    // 2. Price Drop Opportunities
    if (priceDropLeads.length > 0) {
      const avgDrop = priceDropLeads.reduce((sum, l) => {
        if (!l.list_price_min || !l.list_price) return sum
        return sum + ((l.list_price_min - l.list_price) / l.list_price_min) * 100
      }, 0) / priceDropLeads.length

      insightsList.push({
        id: 'price-drops',
        type: 'opportunity',
        priority: 'high',
        title: 'Price Reduction Opportunities',
        description: `${priceDropLeads.length} properties have reduced prices, indicating motivated sellers.`,
        metric: `Avg Price Drop: ${avgDrop.toFixed(1)}%`,
        action: 'Contact sellers immediately - time-sensitive',
        icon: TrendingDown,
        data: priceDropLeads.slice(0, 5)
      })
    }

    // 3. Expired Listings
    if (expiredLeads.length > 0) {
      insightsList.push({
        id: 'expired',
        type: 'opportunity',
        priority: 'medium',
        title: 'Expired Listing Opportunities',
        description: `${expiredLeads.length} expired listings identified. These sellers may be open to new representation.`,
        metric: `Total Value: $${(expiredLeads.reduce((sum, l) => sum + (l.list_price || 0), 0) / 1000000).toFixed(1)}M`,
        action: 'Reach out to expired listing owners',
        icon: Clock,
        data: expiredLeads.slice(0, 5)
      })
    }

    // 4. High-Value Properties
    if (highValueLeads.length > 0) {
      insightsList.push({
        id: 'high-value',
        type: 'opportunity',
        priority: 'high',
        title: 'High-Value Property Portfolio',
        description: `${highValueLeads.length} properties valued over $500K. Focus on these for maximum commission potential.`,
        metric: `Total Value: $${(highValueLeads.reduce((sum, l) => sum + (l.list_price || 0), 0) / 1000000).toFixed(1)}M`,
        action: 'Prioritize high-value leads',
        icon: DollarSign,
        data: highValueLeads.slice(0, 5)
      })
    }

    // 5. Growth Trend
    if (growthRate > 20) {
      insightsList.push({
        id: 'growth',
        type: 'success',
        priority: 'medium',
        title: 'Strong Lead Growth',
        description: `Lead volume increased ${growthRate.toFixed(0)}% in the last 7 days. Your pipeline is expanding rapidly.`,
        metric: `${last7Days} new leads this week`,
        action: 'Maintain current acquisition strategy',
        icon: TrendingUp
      })
    } else if (growthRate < -10 && total > 10) {
      insightsList.push({
        id: 'decline',
        type: 'warning',
        priority: 'high',
        title: 'Lead Volume Declining',
        description: `Lead volume decreased ${Math.abs(growthRate).toFixed(0)}% compared to last week. Consider expanding search criteria.`,
        metric: `${last7Days} leads vs ${previous7Days} last week`,
        action: 'Review and expand lead sources',
        icon: TrendingDown
      })
    }

    // 6. Enrichment Gap
    const enrichmentRate = total > 0 ? (enrichedCount / total) * 100 : 0
    if (enrichmentRate < 60 && total > 5) {
      insightsList.push({
        id: 'enrichment',
        type: 'info',
        priority: 'medium',
        title: 'Enrichment Opportunity',
        description: `Only ${enrichmentRate.toFixed(0)}% of leads are enriched. Run enrichment to unlock contact information and AI scores.`,
        metric: `${total - enrichedCount} leads need enrichment`,
        action: 'Run bulk enrichment on unenriched leads',
        icon: Sparkles
      })
    }

    // 7. Geographic Concentration
    if (stateConcentration > 40 && total > 10) {
      insightsList.push({
        id: 'geographic',
        type: 'info',
        priority: 'low',
        title: 'Geographic Concentration',
        description: `${topState[0]} represents ${stateConcentration.toFixed(0)}% of your leads. Consider diversifying to reduce market risk.`,
        metric: `${topState[1]} properties in ${topState[0]}`,
        action: 'Expand search to additional markets',
        icon: MapPin
      })
    }

    // 8. Undervalued Properties
    if (pricePerSqftLeads.length > 0 && avgPricePerSqft > 0) {
      insightsList.push({
        id: 'undervalued',
        type: 'opportunity',
        priority: 'medium',
        title: 'Undervalued Properties Detected',
        description: `${pricePerSqftLeads.length} properties priced below $100/sqft. These may represent excellent investment opportunities.`,
        metric: `Market avg: $${avgPricePerSqft.toFixed(0)}/sqft`,
        action: 'Investigate undervalued properties',
        icon: Zap,
        data: pricePerSqftLeads.slice(0, 5)
      })
    }

    // 9. Missing Contact Info
    const missingContact = listings.filter(l => !l.agent_email && !l.agent_phone && !l.agent_name)
    if (missingContact.length > 0 && missingContact.length < total * 0.5) {
      insightsList.push({
        id: 'missing-contact',
        type: 'warning',
        priority: 'medium',
        title: 'Missing Contact Information',
        description: `${missingContact.length} leads are missing contact information. Enrich these leads to enable outreach.`,
        metric: `${((missingContact.length / total) * 100).toFixed(0)}% of leads`,
        action: 'Enrich leads with missing contact info',
        icon: AlertTriangle
      })
    }

    // 10. Market Activity Score
    const activeListings = listings.filter(l => l.active === true).length
    const activityRate = total > 0 ? (activeListings / total) * 100 : 0
    if (activityRate > 70) {
      insightsList.push({
        id: 'high-activity',
        type: 'success',
        priority: 'low',
        title: 'High Market Activity',
        description: `${activityRate.toFixed(0)}% of your leads are active listings. This indicates a healthy, active market.`,
        metric: `${activeListings} active listings`,
        action: 'Continue monitoring active listings',
        icon: BarChart3
      })
    }

    // Sort by priority and type
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const typeOrder = { opportunity: 0, warning: 1, info: 2, success: 3 }
    
    return insightsList.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return typeOrder[a.type] - typeOrder[b.type]
    })
  }, [listings])

  if (insights.length === 0) {
    return (
      <div style={{
        background: 'var(--color-ui-background-primary)',
        border: `1px solid var(--color-ui-border-default)`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-lg)',
        boxShadow: 'var(--elevation-2)',
        textAlign: 'center'
      }}>
        <Lightbulb style={{ 
          width: '48px', 
          height: '48px', 
          color: 'var(--color-ui-text-base-tertiary)',
          margin: '0 auto var(--spacing-md)'
        }} />
        <p style={{
          fontFamily: 'var(--family-base-body)',
          fontSize: 'var(--type-size-step-2)',
          color: 'var(--color-ui-text-base-secondary)',
          margin: 0
        }}>
          No insights available yet. Add more prospects to generate intelligent recommendations.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-md)'
    }}>
      {insights.map((insight) => {
        const typeColors = {
          opportunity: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', icon: '#10B981' },
          warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', icon: '#F59E0B' },
          info: { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)', icon: '#06B6D4' },
          success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', icon: '#22C55E' }
        }
        const colors = typeColors[insight.type]

        return (
          <div
            key={insight.id}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-lg)',
              boxShadow: 'var(--elevation-2)',
              position: 'relative'
            }}
          >
            {/* Priority Badge */}
            {insight.priority === 'high' && (
              <div style={{
                position: 'absolute',
                top: 'var(--spacing-md)',
                right: 'var(--spacing-md)',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                background: '#EF4444',
                color: 'white',
                borderRadius: 'var(--radius-xs)',
                fontSize: 'var(--type-size-step-0)',
                fontWeight: 'var(--weight-bold)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                High Priority
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              alignItems: 'flex-start'
            }}>
              {/* Icon */}
              <div style={{
                flexShrink: 0,
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <insight.icon style={{ width: '24px', height: '24px', color: colors.icon }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  <h3 style={{
                    fontFamily: 'var(--family-base-body)',
                    fontSize: 'var(--type-size-step-3)',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--color-ui-text-base-primary)',
                    margin: 0
                  }}>
                    {insight.title}
                  </h3>
                </div>

                <p style={{
                  fontFamily: 'var(--family-base-body)',
                  fontSize: 'var(--type-size-step-2)',
                  color: 'var(--color-ui-text-base-secondary)',
                  marginBottom: 'var(--spacing-sm)',
                  lineHeight: '1.6'
                }}>
                  {insight.description}
                </p>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--spacing-md)',
                  alignItems: 'center'
                }}>
                  {insight.metric && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      background: 'var(--color-ui-background-primary)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--family-base-body)',
                      fontSize: 'var(--type-size-step-1)',
                      fontWeight: 'var(--weight-medium)',
                      color: 'var(--color-ui-text-base-primary)'
                    }}>
                      <BarChart3 style={{ width: '14px', height: '14px' }} />
                      {insight.metric}
                    </div>
                  )}

                  {insight.action && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      background: 'var(--color-ui-background-primary)',
                      borderRadius: 'var(--radius-xs)',
                      fontFamily: 'var(--family-base-body)',
                      fontSize: 'var(--type-size-step-1)',
                      color: 'var(--color-ui-text-base-secondary)',
                      fontStyle: 'italic'
                    }}>
                      <Lightbulb style={{ width: '14px', height: '14px' }} />
                      {insight.action}
                    </div>
                  )}
                </div>

                {/* Sample Data */}
                {insight.data && insight.data.length > 0 && (
                  <div style={{
                    marginTop: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-ui-background-primary)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid var(--color-ui-border-default)`
                  }}>
                    <div style={{
                      fontFamily: 'var(--family-base-body)',
                      fontSize: 'var(--type-size-step-1)',
                      fontWeight: 'var(--weight-bold)',
                      color: 'var(--color-ui-text-base-secondary)',
                      marginBottom: 'var(--spacing-sm)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Top Examples:
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-xs)'
                    }}>
                      {insight.data.map((item: Listing, idx: number) => (
                        <div
                          key={item.listing_id || idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 'var(--spacing-xs)',
                            fontSize: 'var(--type-size-step-1)',
                            color: 'var(--color-ui-text-base-primary)'
                          }}
                        >
                          <span>
                            {item.street || 'N/A'}, {item.city || ''} {item.state || ''}
                          </span>
                          {item.list_price && (
                            <span style={{ fontWeight: 'var(--weight-medium)' }}>
                              ${(item.list_price / 1000).toFixed(0)}K
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
