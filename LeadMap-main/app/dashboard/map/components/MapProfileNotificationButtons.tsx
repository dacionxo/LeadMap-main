'use client'

import { Icon } from '@iconify/react'
import { useApp } from '@/app/providers'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import NotificationsDropdown from '../../components/NotificationsDropdown'

/**
 * User profile and notification dropdowns for the map page.
 * Imported from /dashboard Header - same notifications and profile menu.
 * Uses existing map icons (notification bell + profile avatar).
 */
export default function MapProfileNotificationButtons() {
  const { profile, user, signOut } = useApp()
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const initial = profile?.name?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="flex items-center gap-3" role="group" aria-label="User and notifications">
      {/* Notifications Dropdown */}
      <NotificationsDropdown
        open={showNotifications}
        onOpenChange={setShowNotifications}
        onOpen={() => setShowProfileMenu(false)}
        variant="map"
      />

      {/* Profile Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => {
            setShowProfileMenu(!showProfileMenu)
            setShowNotifications(false)
          }}
          aria-expanded={showProfileMenu ? "true" : "false"}
          aria-haspopup="true"
          aria-label="Open profile menu"
          className="group relative w-12 h-12 rounded-full p-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_50px_-12px_rgba(93,135,255,0.18)] dark:hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 dark:focus:ring-offset-slate-900 overflow-hidden"
        >
          <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <span className="text-lg font-semibold text-slate-600 dark:text-slate-300 transform transition-transform duration-500 group-hover:scale-110">{initial}</span>
            )}
          </div>
        </button>
        {showProfileMenu && (
          <div className="absolute right-0 mt-3 w-[321px] origin-top-right rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden z-[101]">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white shadow-md ring-4 ring-white dark:ring-slate-700 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 leading-tight">{profile?.name || 'User'}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">{profile?.email || 'user@example.com'}</p>
                  <span className="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                    {profile?.plan_tier
                      ? profile.plan_tier.charAt(0).toUpperCase() + profile.plan_tier.slice(1).toLowerCase() + ' Plan'
                      : 'Member'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  router.push('/dashboard/settings')
                  setShowProfileMenu(false)
                }}
                className="group relative flex flex-col justify-between rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Icon icon="solar:user-circle-linear" className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">85%</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">My Profile</h4>
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-500 h-1.5 rounded-full w-[85%]" />
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Complete setup</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push('/dashboard')
                  setShowProfileMenu(false)
                }}
                className="group relative flex flex-col justify-between rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                    <Icon icon="solar:notes-linear" className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">2m ago</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">My Notes</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">Review Q3 marketing goals...</p>
                </div>
              </button>
            </div>
            <div className="px-2 pb-2">
              <Link href="/dashboard/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                <Icon icon="solar:settings-linear" className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                Account Settings
              </Link>
              <Link href="/dashboard/billing" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                <Icon icon="solar:card-linear" className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                Billing & Plans
              </Link>
              <Link href="/dashboard/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group">
                <Icon icon="solar:users-group-rounded-linear" className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                Invite Team
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">New</span>
              </Link>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 p-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full group"
              >
                <Icon icon="solar:logout-2-linear" className="h-5 w-5 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
