'use client'

import { Badge } from '@/app/components/ui/badge'
import { cn } from '@/app/lib/utils'
import { Icon } from '@iconify/react'
import { ProgressRing } from './ProgressRing'

interface KpiCompactCardProps {
  value: string | number
  label: string
  deltaPct?: number // Can be 0, negative, or positive
  deltaLabel?: string // e.g., "Since last week" or "from last month"
  ringValue?: number // 0-100, drives donut
  ringColor?: string // Defaults to primary
  onClick?: () => void
  className?: string
}

export function KpiCompactCard({
  value,
  label,
  deltaPct = 0,
  deltaLabel = 'from last month',
  ringValue = 35,
  ringColor,
  onClick,
  className
}: KpiCompactCardProps) {
  // Determine badge variant based on delta
  const getBadgeVariant = () => {
    if (deltaPct > 0) return 'lightSuccess'
    if (deltaPct < 0) return 'lightError'
    return 'lightSecondary'
  }

  const hasDelta = deltaPct !== 0
  const isPositive = deltaPct > 0
  const isNegative = deltaPct < 0

  // Format delta percentage
  const deltaText = deltaPct !== 0 
    ? `${isPositive ? '+' : ''}${deltaPct}%` 
    : '+0%'

  // Determine ring color based on context (default to primary)
  const finalRingColor = ringColor || '#5d87ff'

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card',
        onClick && 'cursor-pointer hover:shadow-lg transition-shadow',
        className
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Text Content */}
        <div className="flex-1 min-w-0">
          {/* Primary Value */}
          <div className="mb-1.5">
            <h3 className="text-4xl font-bold text-dark dark:text-white leading-tight">
              {value}
            </h3>
          </div>
          
          {/* Label */}
          <p className="text-base font-medium text-dark-6 dark:text-gray-400 mb-3">
            {label}
          </p>
          
          {/* Delta Row: Badge + Label */}
          {hasDelta || deltaPct === 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getBadgeVariant()} className="rounded-full px-2.5 py-1 text-sm font-semibold">
                {isPositive && <Icon icon="tabler:chevron-up" className="w-3.5 h-3.5 mr-1" />}
                {isNegative && <Icon icon="tabler:chevron-down" className="w-3.5 h-3.5 mr-1" />}
                {deltaText}
              </Badge>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {deltaLabel}
              </span>
            </div>
          ) : null}
        </div>

        {/* Right Section - Progress Ring */}
        <div className="flex-shrink-0 ml-4">
          <ProgressRing
            size={56}
            strokeWidth={8}
            value={ringValue}
            color={finalRingColor}
          />
        </div>
      </div>
    </div>
  )
}
