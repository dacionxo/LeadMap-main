'use client'

import { WidgetComponentProps } from '../types'
import { Card } from '@/app/components/ui/card'
import { Badge, BadgeProps } from '@/app/components/ui/badge'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

export function TasksWidget({ widget, data, loading, error }: WidgetComponentProps) {
  const tasksData = data || []

  const tasks = tasksData.map((task: any) => {
    const statusMap: Record<string, { status: string; badgeColor: string }> = {
      'high': { status: 'Inprogress', badgeColor: 'lightPrimary' },
      'medium': { status: 'Inpending', badgeColor: 'lightError' },
      'low': { status: 'Completed', badgeColor: 'lightSuccess' },
    }
    const statusInfo = statusMap[task.priority?.toLowerCase()] || statusMap['medium']

    return {
      key: task.id?.toString() || task.key,
      status: task.status || statusInfo.status,
      date: task.date || task.due || '',
      title: task.title,
      description: task.description || task.desc || '',
      tasks: task.tasks || 0,
      comments: task.comments || 0,
      badgeColor: task.badgeColor || statusInfo.badgeColor,
    }
  })

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <div className="mb-5">
        <h4 className="card-title">{widget.title}</h4>
        <p className="card-subtitle">The power of prioritizing your tasks</p>
      </div>
      <SimpleBar className="max-h-[500px]">
        <div className="space-y-6">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No tasks available
            </p>
          ) : (
            tasks.map((item: any, i: number) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="pb-6 border-b last:border-none border-border dark:border-darkborder"
              >
                <div className="flex items-center justify-between">
                  <Badge variant={item.badgeColor as BadgeProps["variant"]} className="rounded-md py-1.5 text-sm">
                    {item.status}
                  </Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.date}</span>
                </div>
                <h6 className="mt-4 text-sm font-medium">{item.title}</h6>
                {item.description && (
                  <p className="pt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                )}
                <div className="flex gap-4 items-center mt-4">
                  <div className="flex gap-2 items-center">
                    <Icon icon="tabler:clipboard" className="text-lg text-primary" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{`${item.tasks} Tasks`}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Icon icon="tabler:message-dots" className="text-lg text-primary" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{`${item.comments} Comments`}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </SimpleBar>
    </Card>
  )
}
