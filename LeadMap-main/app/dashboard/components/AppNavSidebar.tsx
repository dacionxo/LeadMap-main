'use client'

/**
 * AppNavSidebar — Shared inline nav sidebar for all dashboard pages.
 * 1:1 match to reference HTML: w-64, bg-[#F7FAFF] (sidebar-lavender),
 * sidebar-gradient-border, rounded-l-[24px], Material Symbols icons,
 * active item with white bg + shadow + ring, section headings uppercase.
 * Sits inline with the content card, forming a cohesive surface pair.
 */

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/app/lib/utils'

interface NavItem {
  label: string
  icon: string
  href: string
  filled?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Home',
    items: [
      { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
      { label: 'Maps', icon: 'map', href: '/dashboard/map' },
    ],
  },
  {
    title: 'Prospect & Enrich',
    items: [
      { label: 'All Prospects', icon: 'group', href: '/dashboard/prospect-enrich' },
      { label: 'For Sale', icon: 'sell', href: '/dashboard/prospect-enrich?filter=fsbo' },
      { label: 'For Rent', icon: 'key', href: '/dashboard/prospect-enrich?filter=frbo' },
      { label: 'Foreclosures', icon: 'gavel', href: '/dashboard/prospect-enrich?filter=foreclosure' },
      { label: 'Probate', icon: 'policy', href: '/dashboard/prospect-enrich?filter=probate' },
      { label: 'Expired Listings', icon: 'timer_off', href: '/dashboard/prospect-enrich?filter=expired' },
      { label: 'Imports', icon: 'cloud_upload', href: '/dashboard/prospect-enrich?filter=imports' },
    ],
  },
  {
    title: 'Customer Relationship',
    items: [
      { label: 'Lists', icon: 'list_alt', href: '/dashboard/lists' },
      { label: 'Deals', icon: 'handshake', href: '/dashboard/crm/deals' },
      { label: 'Calendar', icon: 'calendar_month', href: '/dashboard/crm/calendar' },
    ],
  },
  {
    title: 'Email Marketing',
    items: [
      { label: 'Unibox', icon: 'mail', href: '/dashboard/unibox' },
      { label: 'Email Campaigns', icon: 'send', href: '/dashboard/email/campaigns' },
      { label: 'Email Analytics', icon: 'analytics', href: '/dashboard/marketing/analytics' },
    ],
  },
  {
    title: 'TOOLS & AUTOMATION',
    items: [
      { label: 'Analytics', icon: 'monitoring', href: '/dashboard/crm/analytics' },
    ],
  },
]

const isActiveHref = (href: string, pathname: string, searchParams: ReturnType<typeof useSearchParams>) => {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/'
  }
  const hrefPath = href.split('?')[0]
  const hrefParams = new URLSearchParams(href.includes('?') ? href.split('?')[1] : '')
  if (!pathname.startsWith(hrefPath)) return false
  if (hrefPath === '/dashboard/prospect-enrich') {
    const currentFilter = searchParams.get('filter')
    const hrefFilter = hrefParams.get('filter')
    if (!hrefFilter) return !currentFilter
    return currentFilter === hrefFilter
  }
  return true
}

export default function AppNavSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <nav
      className="w-64 flex flex-col shrink-0 overflow-y-auto no-scrollbar py-4 px-3 bg-[#F7FAFF] dark:bg-[#0f172a] sidebar-gradient-border rounded-l-[24px] relative z-20 font-display"
      aria-label="Prospect navigation"
    >
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
              {section.title}
            </span>
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActiveHref(item.href, pathname, searchParams)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                    active
                      ? 'text-[#5A8CFF] bg-white shadow-sm ring-1 ring-black/5'
                      : 'text-[#64748B] hover:bg-white/80 hover:text-[#5A8CFF]'
                  )}
                  tabIndex={0}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'material-symbols-outlined text-[20px]',
                      active && 'fill-1'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
