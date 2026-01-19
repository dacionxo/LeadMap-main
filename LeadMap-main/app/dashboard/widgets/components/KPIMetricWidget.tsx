/**
 * KPI Metric Widget
 * Beautiful, modern KPI widget with trend indicators and color coding
 */

'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { WidgetComponentProps, TrendDirection } from '../types'
import { motion } from 'framer-motion'

export function KPIMetricWidget({ widget, data, loading, error }: WidgetComponentProps) {
  const kpiData = data as {
    value?: number | string
    change?: string
    trend?: TrendDirection
    formattedValue?: string
  }

  const value = kpiData?.formattedValue || kpiData?.value || 0
  const change = kpiData?.change || '+0%'
  const trend = kpiData?.trend || 'neutral'

  // Get color scheme based on widget display config or fallback
  const colorScheme = widget.display?.colorScheme || 'primary'
  
  // Color mapping
  const colorMap = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      value: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-500 dark:text-blue-400',
      trendUp: 'text-green-600 dark:text-green-400',
      trendDown: 'text-red-600 dark:text-red-400'
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-950/20',
      border: 'border-green-200 dark:border-green-800',
      value: 'text-green-600 dark:text-green-400',
      icon: 'text-green-500 dark:text-green-400',
      trendUp: 'text-green-600 dark:text-green-400',
      trendDown: 'text-red-600 dark:text-red-400'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      value: 'text-yellow-600 dark:text-yellow-400',
      icon: 'text-yellow-500 dark:text-yellow-400',
      trendUp: 'text-green-600 dark:text-green-400',
      trendDown: 'text-red-600 dark:text-red-400'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-800',
      value: 'text-red-600 dark:text-red-400',
      icon: 'text-red-500 dark:text-red-400',
      trendUp: 'text-green-600 dark:text-green-400',
      trendDown: 'text-red-600 dark:text-red-400'
    },
    info: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/20',
      border: 'border-cyan-200 dark:border-cyan-800',
      value: 'text-cyan-600 dark:text-cyan-400',
      icon: 'text-cyan-500 dark:text-cyan-400',
      trendUp: 'text-green-600 dark:text-green-400',
      trendDown: 'text-red-600 dark:text-red-400'
    },
    secondary: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-800',
      value: 'text-purple-600 dark:text-purple-400',
      icon: 'text-purple-500 dark:text-purple-400',
      trendUp: 'text-green-600 dark:text-green-400',
      trendDown: 'text-red-600 dark:text-red-400'
    },
    neutral: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      value: 'text-gray-900 dark:text-white',
      icon: 'text-gray-500 dark:text-gray-400',
      trendUp: 'text-green-600 dark:text-green-400',
      trendDown: 'text-red-600 dark:text-red-400'
    }
  }

  const colors = colorMap[colorScheme]

  // Format trend indicator
  const getTrendIndicator = () => {
    if (trend === 'up') {
      return (
        <div className={`flex items-center gap-1 ${colors.trendUp}`}>
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">{change}</span>
        </div>
      )
    }
    if (trend === 'down') {
      return (
        <div className={`flex items-center gap-1 ${colors.trendDown}`}>
          <TrendingDown className="w-4 h-4" />
          <span className="text-sm font-medium">{change}</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">+0%</span>
      </div>
    )
  }

  // Get trend text
  const getTrendText = () => {
    if (!change || change === '+0%' || trend === 'neutral') {
      return 'from last month'
    }
    return 'from last month'
  }

  const Icon = widget.icon

  if (loading) {
    return (
      <div className={`h-full rounded-xl ${colors.bg} ${colors.border} border-2 p-6 animate-pulse`}>
        <div className="space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`h-full rounded-xl ${colors.bg} ${colors.border} border-2 p-6`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="text-sm font-medium">Error loading data</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`h-full rounded-xl ${colors.bg} ${colors.border} border-2 p-6 hover:shadow-lg transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {widget.display?.showIcon !== false && (
            <div className={`p-2 rounded-lg ${colors.bg} ${colors.icon}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {widget.title}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`text-4xl font-bold ${colors.value} tracking-tight`}
        >
          {typeof value === 'string' ? value : value.toLocaleString()}
        </motion.div>

        <div className="flex items-center gap-2">
          {getTrendIndicator()}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {getTrendText()}
          </span>
        </div>
      </div>

      {/* Decorative gradient overlay on hover */}
      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10`} />
    </motion.div>
  )
}
