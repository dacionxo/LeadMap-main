'use client'

import { Icon } from '@iconify/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/app/providers'
import { formatTimeAgo } from '@/lib/format-time-ago'

export type NotificationType = 'comment' | 'system' | 'file' | 'warning'

export type NotificationCode =
  | 'sequence_alert'
  | 'trial_reminder'
  | 'plan_overdue'
  | 'account_overdue'
  | 'autopay_failed'
  | 'subscription_upgrade'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  attachment?: string | null
  read: boolean
  created_at: string
  notification_code?: string | null
}

interface NotificationsDropdownProps {
  /** Controlled: open state */
  open?: boolean
  /** Controlled: callback when open changes */
  onOpenChange?: (open: boolean) => void
  /** Callback when dropdown opens (e.g. close profile menu) */
  onOpen?: () => void
  /** Additional className for the trigger button */
  buttonClassName?: string
  /** Variant: 'header' (default), 'deals', 'map' - different button styles */
  variant?: 'header' | 'deals' | 'map'
}

export default function NotificationsDropdown({
  open: controlledOpen,
  onOpenChange,
  onOpen,
  buttonClassName = '',
  variant = 'header',
}: NotificationsDropdownProps) {
  const router = useRouter()
  const { profile, supabase } = useApp()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value)
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!profile?.id) return
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (open) {
      fetchNotifications()
      onOpen?.()
    }
  }, [open, fetchNotifications, onOpen])

  // Real-time: refetch when notifications change (new insert or update e.g. read state)
  useEffect(() => {
    if (!profile?.id || !supabase) return
    const channel = supabase
      .channel('notifications-dropdown-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchNotifications(true)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, supabase, fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleMarkRead = async (id: string, link?: string | null) => {
    const n = notifications.find((x) => x.id === id)
    if (!n || n.read) {
      if (link) router.push(link)
      setOpen(false)
      return
    }
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
    if (link) router.push(link)
    setOpen(false)
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

  /** Icon + wrapper for a notification by notification_code or type */
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
      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold shadow-sm border border-gray-100 dark:border-gray-600">
        {item.title.charAt(0)}
      </div>
    )
    if (item.type === 'system') return wrapper('solar:shield-check-linear', 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800', 'h-5 w-5 text-blue-600 dark:text-blue-400')
    return wrapper('solar:danger-triangle-linear', 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50', 'h-5 w-5 text-amber-500 dark:text-amber-400')
  }

  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Notifications"
      aria-expanded={open ? 'true' : 'false'}
      className={
        variant === 'header'
          ? `relative flex items-center justify-center w-10 h-10 rounded-full text-charcoal dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 ${buttonClassName}`
          : variant === 'deals'
          ? `relative flex items-center justify-center w-9 h-9 rounded-full text-charcoal dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 ${buttonClassName}`
          : `group relative w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:border-primary/30 dark:hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_50px_-12px_rgba(93,135,255,0.18)] dark:hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${buttonClassName}`
      }
    >
      {variant === 'map' ? (
        <Icon
          icon="material-symbols:notifications"
          className="w-6 h-6 transform group-hover:rotate-12 transition-transform duration-300"
          aria-hidden
        />
      ) : (
        <Icon icon="material-symbols:notifications" className="text-[22px]" />
      )}
      {unreadCount > 0 && variant === 'map' && (
        <span className="absolute top-3 right-3.5 flex h-2.5 w-2.5" aria-hidden>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-slate-800" />
        </span>
      )}
      {unreadCount > 0 && variant !== 'map' && (
        <span
          className={
            variant === 'header'
              ? 'absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(93,135,255,0.4)] border-2 border-white dark:border-slate-800'
              : 'absolute top-2.25 right-2.25 w-2.25 h-2.25 bg-primary rounded-full shadow-[0_0_8px_rgba(93,135,255,0.4)] border-2 border-white dark:border-slate-800'
          }
          aria-hidden
        />
      )}
    </button>
  )

  return (
    <div className="relative group/menu" ref={dropdownRef}>
      {triggerButton}

      {open && (
        <div className="absolute right-0 mt-2 w-full max-w-sm sm:w-[384px] bg-white dark:bg-slate-900 rounded-xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.05),0_10px_10px_-5px_rgba(0,0,0,0.01)] dark:shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[101]">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
              Notifications
            </h2>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-primary hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white shadow-sm">
                {unreadCount > 0 ? unreadCount : notifications.length || 0}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[480px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMarkRead(item.id, item.link)}
                  className="block w-full text-left px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 group relative"
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
                        <div className="mt-2 flex items-center p-2 rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 max-w-xs">
                          <Icon
                            icon="solar:document-linear"
                            className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2 shrink-0"
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
                      className="absolute right-6 top-6 w-2 h-2 bg-primary rounded-full shadow-sm"
                      aria-hidden
                    />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-700 p-4 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center text-sm font-medium text-primary hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors group"
            >
              See All Notifications
              <Icon
                icon="solar:arrow-right-linear"
                className="h-5 w-5 ml-1 transform group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
