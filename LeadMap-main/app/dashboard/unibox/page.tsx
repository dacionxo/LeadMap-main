'use client'

import { Suspense } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useSidebar } from '../components/SidebarContext'
import DealsNavbar from '../crm/deals/components/DealsNavbar'
import UniboxContent from './components/UniboxContent'
import { RefreshCw } from 'lucide-react'

function UniboxPageContent() {
  const { isOpen: isSidebarOpen } = useSidebar()

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent('unibox-refresh'))
  }

  return (
    <div className="-mt-[30px]">
      <div
        className="fixed top-0 bottom-0 flex flex-col bg-mesh dark:bg-dark transition-all duration-300 overflow-hidden"
        style={{ left: isSidebarOpen ? '274px' : '79px', right: 0 }}
      >
        <DealsNavbar />
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
          <div className="bg-white/80 dark:bg-dark/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-[0_20px_50px_-12px_rgba(93,135,255,0.12)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] rounded-[2rem] flex flex-col h-full min-h-0 overflow-hidden relative">
            <div
              className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
              aria-hidden
            />

            <header className="shrink-0 z-20 px-8 py-6">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Unibox <span className="text-blue-500">Inbox</span>
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-base">
                    Unified inbox for all your email conversations and leads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  aria-label="Refresh inbox"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </header>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-2 pb-4">
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
                    Loading Unibox...
                  </div>
                }
              >
                <UniboxContent embedded />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UniboxPage() {
  return (
    <DashboardLayout fullBleed hideHeader>
      <UniboxPageContent />
    </DashboardLayout>
  )
}
