'use client'

import { WidgetComponentProps } from '../types'
import { Card } from '@/app/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart'
import { LabelList, Pie, PieChart as RechartsPieChart } from 'recharts'
import { motion } from 'framer-motion'

export function DealStageDistributionWidget({ widget, data, loading, error }: WidgetComponentProps) {
  const stagesData = data?.stages || []

  const stages = stagesData.map((stage: any) => ({
    name: stage.name,
    value: stage.value || 0,
    percentage: stage.percentage || 0
  }))

  const total = stages.reduce((sum: number, s: any) => sum + s.value, 0) || 1

  const chartData = stages.map((stage: any, index: number) => {
    const colorMap = [
      'var(--color-chart-1, #3b82f6)',
      'var(--color-chart-2, #49beff)',
      'var(--color-chart-3, #10b981)',
      'var(--color-chart-4, #f59e0b)',
      'var(--color-chart-5, #8b5cf6)'
    ]
    
    const stageKeyMap: Record<string, string> = {
      'New': 'new',
      'Contacted': 'contacted',
      'Qualified': 'qualified',
      'Proposal': 'proposal',
      'Closed': 'closed'
    }
    
    const stageKey = stageKeyMap[stage.name] || `stage${index}`
    
    return {
      [stageKey]: stage.value,
      browser: stageKey,
      visitors: stage.value,
      fill: colorMap[index] || colorMap[0],
      name: stage.name,
      value: stage.value,
      percentage: total > 0 ? Math.round((stage.value / total) * 100) : 0
    }
  })

  const chartConfig: ChartConfig = {
    visitors: { label: 'Deals' },
    new: { label: 'New', color: 'var(--color-chart-1, #3b82f6)' },
    contacted: { label: 'Contacted', color: 'var(--color-chart-2, #49beff)' },
    qualified: { label: 'Qualified', color: 'var(--color-chart-3, #10b981)' },
    proposal: { label: 'Proposal', color: 'var(--color-chart-4, #f59e0b)' },
    closed: { label: 'Closed', color: 'var(--color-chart-5, #8b5cf6)' },
  } satisfies ChartConfig

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
        <p className="card-subtitle">Breakdown of deals by stage</p>
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <ChartContainer config={chartConfig} className='[&_.recharts-text]:fill-background'>
            <RechartsPieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey='visitors' hideLabel />} />
              <Pie data={chartData} dataKey='visitors'>
                <LabelList
                  dataKey='browser'
                  className='fill-link'
                  stroke='none'
                  fontSize={12}
                  formatter={(value: any) => {
                    const key = value as keyof typeof chartConfig
                    return chartConfig[key]?.label || value
                  }}
                />
              </Pie>
            </RechartsPieChart>
          </ChartContainer>
        </div>
        <div className="flex flex-col gap-2">
          {stages.map((stage: any, index: number) => {
            const colorMap = [
              'var(--color-chart-1, #3b82f6)',
              'var(--color-chart-2, #49beff)',
              'var(--color-chart-3, #10b981)',
              'var(--color-chart-4, #f59e0b)',
              'var(--color-chart-5, #8b5cf6)'
            ]
            const color = colorMap[index] || colorMap[0]
            const percentage = total > 0 ? Math.round((stage.value / total) * 100) : 0
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="py-2.5 border-b border-border dark:border-darkborder flex items-center justify-between last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                  <p className="text-sm font-medium text-foreground dark:text-white">{stage.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground dark:text-white">{stage.value}</p>
                  <p className="text-xs text-muted-foreground">({percentage}%)</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
