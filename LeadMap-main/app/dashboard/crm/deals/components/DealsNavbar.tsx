'use client'

import Link from 'next/link'
import { useApp } from '@/app/providers'
import { useTheme } from '@/components/ThemeProvider'
import { useSidebar } from '../../../components/SidebarContext'

export default function DealsNavbar() {
  const { profile } = useApp()
  const { theme, setTheme } = useTheme()
  const { toggle: toggleSidebar } = useSidebar()

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const userName = profile?.name || 'User'
  const userInitial = userName.charAt(0).toUpperCase()
  const planLabel = profile?.plan_tier
    ? `${(profile.plan_tier as string).toUpperCase().replace(/\s+/g, ' ')} PLAN`
    : 'FREE PLAN'

  return (
    <nav className="shrink-0 px-6 py-4 flex items-center justify-between z-30 bg-transparent">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          aria-label="Search"
        >
          <span className="material-symbols-outlined text-2xl">search</span>
        </button>
      </div>

      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full p-1 border border-white/50 dark:border-slate-600/50 shadow-sm flex items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-lg">grid_view</span>
          Apps
          <span className="material-symbols-outlined text-lg">expand_more</span>
        </Link>
        <Link
          href="/dashboard/crm/calendar"
          className="flex items-center gap-2 px-4 py-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-full text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-lg">calendar_month</span>
          Calendar
        </Link>
        <Link
          href="/dashboard/email/campaigns"
          className="flex items-center gap-2 px-4 py-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-full text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-lg">campaign</span>
          Campaigns
        </Link>
        <Link
          href="/dashboard/unibox"
          className="flex items-center gap-2 px-4 py-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-full text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-lg">mail</span>
          Unibox
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleToggleTheme}
          className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          aria-label="Toggle theme"
        >
          <span className="material-symbols-outlined text-xl">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 relative transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900" />
        </button>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
              {userName}
            </p>
            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded inline-block mt-0.5">
              {planLabel}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
            {userInitial}
          </div>
        </div>
      </div>
    </nav>
  )
}
