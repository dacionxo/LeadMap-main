'use client'

import { Icon } from '@iconify/react'
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
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-primary transition-colors flex justify-center items-center"
          aria-label="Toggle sidebar"
        >
          <Icon icon="material-symbols:menu-rounded" className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="p-2 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-primary transition-colors flex justify-center items-center"
          aria-label="Search"
        >
          <Icon icon="solar:magnifer-linear" className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-1 p-1 bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-600 rounded-full shadow-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-1.5 rounded-full bg-primary/[0.04] text-primary border border-primary/30 transition-all duration-300 shadow-[0_0_15px_-3px_rgba(93,135,255,0.15)]"
        >
          <Icon icon="material-symbols:grid-view" className="text-[18px]" />
          <span className="text-sm font-bold">Apps</span>
          <Icon
            icon="material-symbols:expand-more-rounded"
            height={16}
            className="shrink-0 -mr-0.5"
          />
        </Link>
        <Link
          href="/dashboard/crm/calendar"
          className="flex items-center gap-2 px-5 py-1.5 rounded-full text-[#64748B] dark:text-slate-400 hover:text-charcoal dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/50 transition-all duration-200 group border border-transparent"
        >
          <Icon
            icon="material-symbols:calendar-month"
            className="text-[18px] group-hover:text-primary transition-colors"
          />
          <span className="text-sm font-medium">Calendar</span>
        </Link>
        <Link
          href="/dashboard/email/campaigns"
          className="flex items-center gap-2 px-5 py-1.5 rounded-full text-[#64748B] dark:text-slate-400 hover:text-charcoal dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/50 transition-all duration-200 group border border-transparent"
        >
          <Icon
            icon="material-symbols:campaign"
            className="text-[18px] group-hover:text-primary transition-colors"
          />
          <span className="text-sm font-medium">Campaigns</span>
        </Link>
        <Link
          href="/dashboard/unibox"
          className="flex items-center gap-2 px-5 py-1.5 rounded-full text-[#64748B] dark:text-slate-400 hover:text-charcoal dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/50 transition-all duration-200 group border border-transparent"
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
          className="flex items-center justify-center w-10 h-10 rounded-full text-charcoal dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Icon
              icon="material-symbols:dark-mode-rounded"
              className="text-[22px]"
            />
          ) : (
            <Icon
              icon="material-symbols:light-mode-rounded"
              className="text-[22px]"
            />
          )}
        </button>
        <button
          type="button"
          className="relative flex items-center justify-center w-10 h-10 rounded-full text-charcoal dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
          aria-label="Notifications"
        >
          <Icon
            icon="material-symbols:notifications"
            className="text-[22px]"
          />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(93,135,255,0.4)] border-2 border-white dark:border-slate-800" />
        </button>
        <div className="flex items-center gap-3 pl-1 cursor-pointer group">
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-sm font-semibold text-[#1E293B] dark:text-white group-hover:text-primary transition-colors">
              {userName}
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 tracking-wider mt-1.5 uppercase">
              {planLabel}
            </span>
          </div>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-100 dark:border-slate-700 bg-primary text-sm font-bold text-white shadow-sm">
            {userInitial}
          </div>
        </div>
      </div>
    </nav>
  )
}
