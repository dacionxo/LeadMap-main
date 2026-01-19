'use client'

import { cn } from '@/app/lib/utils'

interface ProgressRingProps {
  size?: number
  strokeWidth?: number
  value: number // 0-100
  trackClassName?: string
  indicatorClassName?: string
  className?: string
  color?: string
}

export function ProgressRing({
  size = 56,
  strokeWidth = 8,
  value,
  trackClassName,
  indicatorClassName,
  className,
  color
}: ProgressRingProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clampedValue / 100)

  return (
    <svg
      width={size}
      height={size}
      className={cn('transform -rotate-90', className)}
      aria-hidden="true"
    >
      {/* Track (background circle) */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        className={cn('dark:stroke-gray-700', trackClassName)}
      />
      {/* Progress indicator */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color || '#5d87ff'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn('transition-all duration-500', indicatorClassName)}
      />
    </svg>
  )
}
