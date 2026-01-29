'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { ChevronDown } from 'lucide-react'
import FormsOnboardingModal from './components/FormsOnboardingModal'

export default function FormsPage() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user has completed forms onboarding
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/crm/forms/onboarding-status', { credentials: 'include' })
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
      const response = await fetch('/api/crm/forms/complete-onboarding', {
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
      <div className="min-h-screen bg-[#f5f5f0] dark:bg-gray-900 pointer-events-none select-none">
        {/* Header */}
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forms</h1>
        </div>

        {/* Form Examples Section */}
        <div className="px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Form Autofill */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Form autofill
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    hello inc.
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value="alex@comp"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Name"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Job title"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Company"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Industry"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Company size"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                  </div>
                  
                  <button 
                    disabled
                    className="w-full mt-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed opacity-75 font-medium"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>

            {/* Form Shortening */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Form shortening
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    hello inc.
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value="alex@comp"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Name"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Job title"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Company"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Industry"
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                      />
                    </div>
                    <div className="relative">
                      <select 
                        disabled
                        className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-not-allowed opacity-75"
                      >
                        <option>Purpose of the demo</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div>
                      <textarea
                        placeholder="Any specific features you'd like to focus?"
                        rows={3}
                        readOnly
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 resize-none cursor-not-allowed opacity-75"
                      />
                    </div>
                  </div>
                  
                  <button 
                    disabled
                    className="w-full mt-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed opacity-75 font-medium"
                  >
                    Request a demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promotional Section */}
        <div className="px-6 pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Capture more qualified leads with form enrichment
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Shorten your existing website forms, autofill known fields, and enrich every form submission with NextDeal data.
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <button 
                disabled
                className="px-6 py-3 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed opacity-75 font-medium"
              >
                Learn more
              </button>
              <button 
                disabled
                className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed opacity-75 font-medium shadow-sm"
              >
                Create form
              </button>
            </div>
          </div>
        </div>

        {/* Onboarding Modal */}
        {showOnboarding && (
          <FormsOnboardingModal
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
