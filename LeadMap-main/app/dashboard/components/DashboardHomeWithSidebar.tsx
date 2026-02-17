'use client'

import AppNavSidebar from '../components/AppNavSidebar'
import DashboardClient from './DashboardClient'

export default function DashboardHomeWithSidebar() {
  return (
    <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
      <AppNavSidebar />
      <div className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden">
        <DashboardClient />
      </div>
    </div>
  )
}

