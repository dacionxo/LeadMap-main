'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/app/providers'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../components/DashboardLayout'
import { Icon } from '@iconify/react'
import { formatTimeAgo } from '@/lib/format-time-ago'
import type { Notification, NotificationCode } from '../components/NotificationsDropdown'

export default function NotificationsPage() {
  const { profile } = useApp()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=100', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile) {
      router.push('/')
      return
    }
    fetchNotifications()
  }, [profile, router, fetchNotifications])

  const handleMarkRead = async (id: string) => {
    const n = notifications.find((x) => x.id === id)
    if (!n || n.read) return
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
      })
      setNotifications((prev) =>
        prev.map((x) => (x.id === id ? { ...x, read: true } : x))
      )
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        credentials: 'include',
      })
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })))
    } catch {
      // ignore
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  function NotificationIcon({ item }: { item: Notification }) {
    const code = item.notification_code as NotificationCode | undefined
    const wrapper = (icon: string, bg: string, iconClass: string) => (
      <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${bg}`}>
        <Icon icon={icon} className={iconClass} />
      </div>
    )
    if (code === 'sequence_alert') return wrapper('solar:plain-2-linear', 'bg-violet-50 dark:bg-violet-900/30 border-violet-100 dark:border-violet-800', 'h-5 w-5 text-violet-600 dark:text-violet-400')
    if (code === 'trial_reminder') return wrapper('solar:clock-circle-linear', 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50', 'h-5 w-5 text-amber-500 dark:text-amber-400')
    if (code === 'plan_overdue' || code === 'account_overdue') return wrapper('solar:calendar-mark-linear', 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50', 'h-5 w-5 text-red-500 dark:text-red-400')
    if (code === 'autopay_failed') return wrapper('solar:card-withdraw-linear', 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50', 'h-5 w-5 text-orange-500 dark:text-orange-400')
    if (code === 'subscription_upgrade') return wrapper('solar:star-linear', 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800', 'h-5 w-5 text-emerald-600 dark:text-emerald-400')
    if (item.type === 'comment' || item.type === 'file') return (
      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold shadow-sm">
        {item.title.charAt(0)}
      </div>
    )
    if (item.type === 'system') return wrapper('solar:shield-check-linear', 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800', 'h-5 w-5 text-blue-600 dark:text-blue-400')
    return wrapper('solar:danger-triangle-linear', 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50', 'h-5 w-5 text-amber-500 dark:text-amber-400')
  }

  if (!profile) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your in-app notifications
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleMarkRead(item.id)
                    if (item.link) router.push(item.link)
                  }}
                  className="relative block w-full text-left px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <NotificationIcon item={item} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {item.message}
                      </p>
                      {item.attachment && (
                        <div className="mt-2 flex items-center p-2 rounded bg-gray-50 dark:bg-gray-800 max-w-xs">
                          <Icon
                            icon="solar:document-linear"
                            className="h-4 w-4 text-gray-400 mr-2 shrink-0"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                            {item.attachment}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center">
                        {!item.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2 shrink-0" />
                        )}
                        {formatTimeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                  {!item.read && (
                    <span
                      className="absolute right-6 top-6 w-2 h-2 bg-primary rounded-full"
                      aria-hidden
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
