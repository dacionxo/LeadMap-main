'use client'

import { WidgetComponentProps } from '../types'
import { Card } from '@/app/components/ui/card'
import { FunnelChart } from 'react-funnel-pipeline'
import 'react-funnel-pipeline/dist/index.css'

export function PipelineFunnelWidget({ widget, data, loading, error }: WidgetComponentProps) {
  const stagesData = data?.stages || []

  const funnelData = stagesData
    .filter((stage: any) => stage.value > 0)
    .map((stage: any) => ({
      name: stage.name,
      value: stage.value || 0
    }))

  const colorPalette = [
    '#3b82f6',
    '#49beff',
    '#10b981',
    '#f59e0b',
    '#8b5cf6'
  ]

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <div className="mb-5">
        <h4 className="card-title">{widget.title}</h4>
        <p className="card-subtitle">Deal progression through stages</p>
      </div>
      <div className="w-full">
        <FunnelChart
          data={funnelData.length > 0 ? funnelData : [{ name: 'No Data', value: 1 }]}
          pallette={colorPalette}
          showValues={true}
          showNames={true}
          chartWidth={undefined}
          chartHeight={400}
        />
      </div>
    </Card>
  )
}
