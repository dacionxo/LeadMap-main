'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Plus, Search, Filter, LayoutGrid, Layers3, Save, Calendar, Settings, X } from 'lucide-react'
import DealsOnboardingModal from './components/DealsOnboardingModal'

export default function DealsPage() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview')

  useEffect(() => {
    // Check if user has completed deals onboarding
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/crm/deals/onboarding-status', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setShowOnboarding(!data.completed)
        } else {
          setShowOnboarding(true)
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        setShowOnboarding(true)
      }
    }
    checkOnboardingStatus()
  }, [])

  const handleBeginSetup = async () => {
    try {
      const response = await fetch('/api/crm/deals/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (response.ok) {
        setShowOnboarding(false)
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    }
  }

  const handleMaybeLater = () => {
    setShowOnboarding(false)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deals</h1>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                Import CSV
              </button>
              <button className="px-4 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create deal
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Analytics
              <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                New
              </span>
            </button>
          </div>
        </div>

        {/* Toolbar/Filter Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Left Side Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select className="appearance-none pl-8 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All Pipelines</option>
                </select>
                <Layers3 className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select className="appearance-none pl-8 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>All deals</option>
                </select>
                <LayoutGrid className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Show Filters
              </button>

              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search deals"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <button className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save as new view
              </button>

              <div className="relative">
                <select className="appearance-none pl-8 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Created date</option>
                </select>
                <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button className="p-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
          {showOnboarding === null ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            </div>
          ) : showOnboarding ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600 dark:text-gray-400">Deals management coming soon...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Deals content will go here */}
              <p className="text-gray-600 dark:text-gray-400">Deals management coming soon...</p>
            </div>
          )}
        </div>

        {/* Onboarding Modal */}
        {showOnboarding && (
          <DealsOnboardingModal
            isOpen={showOnboarding}
            onClose={handleMaybeLater}
            onBeginSetup={handleBeginSetup}
            onMaybeLater={handleMaybeLater}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
