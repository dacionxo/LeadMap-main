'use client'

import { WidgetComponentProps } from '../types'

export function LeadSourceWidget({ widget, data }: WidgetComponentProps) {
  const sources = data?.sources || []
  
  return (
    <div className="space-y-3">
      {sources.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          No source data available
        </p>
      ) : (
        sources.map((source: any, index: number) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">{source.name}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{source.count}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${source.percentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right ml-2">{source.percentage}%</span>
          </div>
        ))
      )}
    </div>
  )
}
