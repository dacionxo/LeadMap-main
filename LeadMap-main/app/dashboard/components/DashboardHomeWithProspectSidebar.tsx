'use client'

import ProspectNavSidebar from '../prospect-enrich/components/ProspectNavSidebar'
import DashboardClient from './DashboardClient'

/**
 * Dashboard home content with the e7c3423 layout: ProspectNavSidebar + content card.
 * Used only by /dashboard page for 1:1 match to commit e7c3423.
 */
export default function DashboardHomeWithProspectSidebar() {
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden h-full w-full">
      <ProspectNavSidebar />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-dark/90">
        <div className="container relative z-10 py-[30px] flex-1">
          <DashboardClient />
        </div>
      </div>
    </div>
  )
}
