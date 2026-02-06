'use client'

import { Icon } from '@iconify/react'
import { useApp } from '@/app/providers'
import { useRouter } from 'next/navigation'

/**
 * User profile and notification menu for the map page.
 * 1:1 implementation: notifications button (with red ping badge) and profile avatar button.
 * Placed top-right, to the left of the map's fullscreen control.
 * Uses Tailwind-Admin–compatible classes and supports dark mode.
 */
export default function MapProfileNotificationButtons() {
  const { profile, user } = useApp()
  const router = useRouter()
  const avatarUrl = (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null

  const handleNotificationsClick = () => {
    router.push('/dashboard')
    // Or open a notifications panel if you have one
  }

  const handleProfileClick = () => {
    router.push('/dashboard/settings')
    // Or open profile dropdown
  }

  const initial = profile?.name?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="flex items-center gap-4" role="group" aria-label="User and notifications">
      {/* Notifications button - with ping badge */}
      <button
        type="button"
        onClick={handleNotificationsClick}
        className="group relative w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:border-primary/30 dark:hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        aria-label="Notifications"
      >
        <Icon
          icon="material-symbols:notifications"
          className="w-6 h-6 transform group-hover:rotate-12 transition-transform duration-300"
          aria-hidden
        />
        {/* Red ping badge */}
        <span className="absolute top-3 right-3.5 flex h-2.5 w-2.5" aria-hidden>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-slate-800" />
        </span>
      </button>

      {/* Profile / Avatar button */}
      <button
        type="button"
        onClick={handleProfileClick}
        className="group relative w-12 h-12 rounded-full p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_2px_4px_-1px_rgba(0,0,0,0.02)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 dark:focus:ring-offset-slate-900 overflow-hidden"
        aria-label="User profile"
      >
        <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <span className="text-lg font-semibold text-slate-600 dark:text-slate-300 transform transition-transform duration-500 group-hover:scale-110">
              {initial}
            </span>
          )}
          <div
            className="absolute inset-0 bg-[#0F62FE]/0 group-hover:bg-[#0F62FE]/5 transition-colors duration-300"
            aria-hidden
          />
        </div>
      </button>
    </div>
  )
}
