'use client'

import { WidgetComponentProps } from '../types'
import { Card } from '@/app/components/ui/card'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

export function RecentActivityWidget({ widget, data, loading, error }: WidgetComponentProps) {
  const activitiesData = data || []

  const activities = activitiesData.map((activity: any) => {
    let iconName = activity.icon || activity.iconType || 'tabler:activity'
    if (typeof iconName === 'string' && !iconName.startsWith('tabler:')) {
      const iconMap: Record<string, string> = {
        'Sparkles': 'tabler:sparkles',
        'Target': 'tabler:target',
        'Users': 'tabler:users',
        'Activity': 'tabler:activity',
        'Mail': 'tabler:mail',
        'Phone': 'tabler:phone',
      }
      iconName = iconMap[iconName] || 'tabler:activity'
    }

    const colorMap: Record<string, { bg: string; text: string }> = {
      'enrichment': { bg: 'bg-lightprimary', text: 'text-primary' },
      'campaign': { bg: 'bg-lightsuccess', text: 'text-success' },
      'lead': { bg: 'bg-lightinfo dark:bg-darkinfo', text: 'text-info' },
      'default': { bg: 'bg-lightprimary', text: 'text-primary' }
    }
    const colors = colorMap[activity.type] || colorMap.default

    return {
      key: activity.id?.toString() || activity.key,
      icon: iconName,
      title: activity.title,
      desc: activity.description || activity.desc || '',
      time: activity.time || activity.date || '',
      bgColor: colors.bg,
      color: colors.text,
    }
  })

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h4 className="card-title">{widget.title}</h4>
      <p className="card-subtitle">Recent updates and activities</p>
      <SimpleBar className="mt-10 max-h-[400px] pr-6">
        <div className="flex flex-col gap-6">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No recent activity
            </p>
          ) : (
            activities.map((item: any, i: number) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex gap-3 items-center">
                  <div className={`h-11 w-11 rounded-full ${item.bgColor} ${item.color} flex justify-center items-center`}>
                    <Icon icon={item.icon} className="text-xl" />
                  </div>
                  <div>
                    <h6 className="text-sm font-medium">{item.title}</h6>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.time}</span>
              </motion.div>
            ))
          )}
        </div>
      </SimpleBar>
    </Card>
  )
}
