'use client'

import { Badge } from '@/app/components/ui/badge'
import { Card } from '@/app/components/ui/card'
import { cn } from '@/app/lib/utils'
import { Icon } from '@iconify/react'
import React from 'react'

export type KpiAccent = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
export type KpiTrend = 'up' | 'down' | 'neutral'
export type KpiChartVariant = 'none' | 'donut' | 'sparkline'

export interface KpiStatCardProps {
  title: string
  value: string | number
  deltaText?: string
  trend?: KpiTrend
  accent?: KpiAccent
  icon?: React.ComponentType<{ className?: string }>
  chartVariant?: KpiChartVariant
  chartPercentage?: number
  onClick?: () => void
  className?: string
}

/**
 * Maps accent type to TailwindAdmin CSS variable for chart colors
 */
function getChartColor(accent: KpiAccent = 'primary'): string {
  const accentToChartVar: Record<KpiAccent, string> = {
    primary: 'var(--color-chart-1)',
    secondary: 'var(--color-chart-2)',
    success: 'var(--color-chart-3)',
    warning: 'var(--color-chart-4)',
    error: 'var(--color-chart-5)',
    info: 'var(--color-chart-1)', // fallback to primary
  }
  return accentToChartVar[accent]
}

/**
 * Maps accent type to TailwindAdmin background/text classes
 */
function getAccentClasses(accent: KpiAccent = 'primary'): { bg: string; text: string } {
  const accentMap: Record<KpiAccent, { bg: string; text: string }> = {
    primary: { bg: 'bg-lightprimary', text: 'text-primary' },
    secondary: { bg: 'bg-lightsecondary', text: 'text-secondary' },
    success: { bg: 'bg-lightsuccess', text: 'text-success' },
    warning: { bg: 'bg-lightwarning', text: 'text-warning' },
    error: { bg: 'bg-lighterror', text: 'text-error' },
    info: { bg: 'bg-lightinfo', text: 'text-info' },
  }
  return accentMap[accent]
}

/**
 * Maps trend to Badge variant
 */
function getTrendBadgeVariant(trend: KpiTrend = 'neutral'): BadgeProps['variant'] {
  const trendMap: Record<KpiTrend, BadgeProps['variant']> = {
    up: 'lightSuccess',
    down: 'lightError',
    neutral: 'gray',
  }
  return trendMap[trend]
}

type BadgeProps = React.ComponentProps<typeof Badge>

/**
 * TailwindAdmin-style KPI Stat Card Component
 * 
 * Matches TailwindAdmin design system:
 * - Uses Card wrapper
 * - Uses card-title/card-subtitle typography
 * - Colored icon tiles (bg-lightprimary text-primary)
 * - Trend badges via Badge variants
 * - Charts use CSS variables (var(--color-chart-1))
 */
export function KpiStatCard({
  title,
  value,
  deltaText,
  trend = 'neutral',
  accent = 'primary',
  icon: IconComponent,
  chartVariant = 'donut',
  chartPercentage,
  onClick,
  className,
}: KpiStatCardProps) {
  const accentClasses = getAccentClasses(accent)
  const badgeVariant = getTrendBadgeVariant(trend)
  const chartColor = getChartColor(accent)

  // Calculate chart percentage if not provided (based on value)
  let displayChartPercentage = chartPercentage
  if (chartPercentage === undefined && chartVariant === 'donut') {
    const numericValue = typeof value === 'number' 
      ? value 
      : parseInt(value.toString().replace(/[^0-9]/g, '')) || 0
    displayChartPercentage = Math.min(Math.max((numericValue % 100) || 35, 10), 90)
  }

  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value

  return (
    <Card
      className={cn(
        'rounded-[10px] bg-white p-4 shadow-1 dark:bg-gray-dark dark:shadow-card md:p-6 xl:p-7.5 cursor-pointer hover:shadow-lg transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Text Content */}
        <div className="flex-1">
          {/* Icon (if provided) */}
          {IconComponent && (
            <div className={cn('p-3 rounded-lg inline-block mb-4', accentClasses.bg, accentClasses.text)}>
              <IconComponent className="w-6 h-6" />
            </div>
          )}

          {/* Value */}
          <div className="mb-1.5">
            <h3 className="text-4xl font-bold text-dark dark:text-white leading-tight">
              {formattedValue}
            </h3>
          </div>

          {/* Title/Label */}
          <p className="text-base font-medium text-dark-6 dark:text-gray-400 mb-3 card-subtitle">
            {title}
          </p>

          {/* Delta Badge with text */}
          {deltaText && (
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant} className="rounded-full text-sm font-semibold px-2.5 py-1">
                <span className="flex items-center gap-1">
                  {trend === 'up' && <Icon icon="tabler:chevron-up" className="w-3.5 h-3.5" />}
                  {trend === 'down' && <Icon icon="tabler:chevron-down" className="w-3.5 h-3.5" />}
                  {deltaText}
                </span>
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                from last month
              </span>
            </div>
          )}
        </div>

        {/* Right Section - Chart */}
        {chartVariant === 'donut' && displayChartPercentage !== undefined && (
          <div className="flex-shrink-0 ml-4" aria-label={`${displayChartPercentage.toFixed(0)}% progress`}>
            <svg width="80" height="80" className="transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
                className="dark:stroke-gray-700"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke={chartColor}
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - displayChartPercentage / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>
        )}
      </div>
    </Card>
  )
}
