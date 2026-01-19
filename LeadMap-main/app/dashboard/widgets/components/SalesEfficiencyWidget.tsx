'use client'

import { WidgetComponentProps } from '../types'

export function SalesEfficiencyWidget({ widget, data }: WidgetComponentProps) {
  const metrics = data || {
    avgResponseTime: '2.5h',
    conversionRate: '12%',
    avgDealSize: '$45K',
    salesCycle: '28 days'
  }
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Response Time</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{metrics.avgResponseTime}</p>
      </div>
      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Conversion Rate</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{metrics.conversionRate}</p>
      </div>
      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Deal Size</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{metrics.avgDealSize}</p>
      </div>
      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sales Cycle</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{metrics.salesCycle}</p>
      </div>
    </div>
  )
}
