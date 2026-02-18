'use client'

import { Icon } from '@iconify/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/app/providers'
import { useTheme } from '@/components/ThemeProvider'
import { useSidebar } from '../../../components/SidebarContext'
import AppLinks from '../../../components/header/AppLinks'
import Search from '../../../components/header/Search'
import NotificationsDropdown from '../../../components/NotificationsDropdown'

export default function DealsNavbar() {
  const { profile, user, signOut } = useApp()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { toggle: toggleSidebar } = useSidebar()
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const userName = profile?.name || 'User'
  const userInitial = userName.charAt(0).toUpperCase()
  const planLabel = profile?.plan_tier
    ? `${(profile.plan_tier as string).toUpperCase().replace(/\s+/g, ' ')} PLAN`
    : 'FREE PLAN'

  return (
    <nav className="shrink-0 px-6 py-[14.4px] flex items-center justify-between z-30 bg-transparent">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-primary transition-colors flex justify-center items-center"
          aria-label="Toggle sidebar"
        >
          <Icon icon="material-symbols:menu-rounded" className="w-5 h-5" />
        </button>
        <Search />
      </div>

      <div className="flex items-center justify-center gap-1 p-[3.6px] bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm">
        <AppLinks />
        <Link
          href="/dashboard/crm/calendar"
          className="flex items-center gap-2 px-5 py-[5.4px] rounded-full text-[#64748B] dark:text-slate-400 hover:text-charcoal dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/50 transition-all duration-200 group border border-transparent"
        >
          <Icon
            icon="material-symbols:calendar-month"
            className="text-[18px] group-hover:text-primary transition-colors"
          />
          <span className="text-sm font-medium">Calendar</span>
        </Link>
        <Link
          href="/dashboard/email/campaigns"
          className="flex items-center gap-2 px-5 py-[5.4px] rounded-full text-[#64748B] dark:text-slate-400 hover:text-charcoal dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/50 transition-all duration-200 group border border-transparent"
        >
          <Icon
            icon="material-symbols:campaign"
            className="text-[18px] group-hover:text-primary transition-colors"
          />
          <span className="text-sm font-medium">Campaigns</span>
        </Link>
        <Link
          href="/dashboard/unibox"
          className="flex items-center gap-2 px-5 py-[5.4px] rounded-full text-[#64748B] dark:text-slate-400 hover:text-charcoal dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/50 transition-all duration-200 group border border-transparent"
        >
          <Icon
            icon="material-symbols:mark-email-unread"
            className="text-[18px] group-hover:text-primary transition-colors"
          />
          <span className="text-sm font-medium">Unibox</span>
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleToggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-full text-charcoal dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Icon icon="material-symbols:dark-mode-rounded" className="text-[22px]" />
          ) : (
            <Icon icon="material-symbols:light-mode-rounded" className="text-[22px]" />
          )}
        </button>

        <NotificationsDropdown
          open={showNotifications}
          onOpenChange={setShowNotifications}
          onOpen={() => setShowProfileMenu(false)}
          variant="deals"
        />

        <div className="relative group/menu" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
            }}
            aria-haspopup="true"
            aria-label="Open profile menu"
            className="flex items-center gap-3 pl-1 cursor-pointer group focus:outline-none"
          >
            <div className="hidden sm:flex flex-col items-end leading-none">
              <span className="text-sm font-semibold text-[#1E293B] dark:text-white group-hover:text-primary transition-colors">
                {userName}
              </span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 tracking-wider mt-1.5 uppercase">
                {planLabel}
              </span>
            </div>
            <div className="relative group-hover:scale-105 transition-transform duration-300">
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-purple-500 rounded-full opacity-0 group-hover:opacity-40 blur-[4px] transition-opacity duration-300" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-100 dark:border-slate-700 bg-primary text-sm font-bold text-white shadow-sm overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-[321px] origin-top-right rounded-2xl bg-card-light dark:bg-card-dark shadow-2xl ring-1 ring-black/5 border border-border-light dark:border-border-dark overflow-hidden z-50">
              <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white shadow-md ring-4 ring-white dark:ring-slate-700 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        userInitial
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-slate-50 leading-tight">
                        {profile?.name || 'User'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                        {profile?.email || 'user@example.com'}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                        {profile?.plan_tier
                          ? profile.plan_tier.charAt(0).toUpperCase() +
                            profile.plan_tier.slice(1).toLowerCase() +
                            ' Plan'
                          : 'Member'}
                      </span>
                    </div>
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
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                      85%
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                      My Profile
                    </h4>
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-2">
                      <div className="bg-blue-500 h-1.5 rounded-full w-[85%]" />
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                      Complete setup
                    </p>
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
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                      2m ago
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                      My Notes
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      Review Q3 marketing goals...
                    </p>
                  </div>
                </button>
              </div>

              <div className="px-2 pb-2">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <Icon
                    icon="solar:settings-linear"
                    className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors"
                  />
                  Account Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <Icon
                    icon="solar:card-linear"
                    className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors"
                  />
                  Billing & Plans
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <Icon
                    icon="solar:users-group-rounded-linear"
                    className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors"
                  />
                  Invite Team
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    New
                  </span>
                </Link>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 p-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full group"
                >
                  <Icon
                    icon="solar:logout-2-linear"
                    className="h-5 w-5 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors"
                  />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
