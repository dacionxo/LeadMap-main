'use client'

import { useState } from 'react'
import { X, BarChart3, Zap, Sparkles, Star } from 'lucide-react'

interface DealsOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onBeginSetup: () => void
  onMaybeLater: () => void
}

export default function DealsOnboardingModal({
  isOpen,
  onClose,
  onBeginSetup,
  onMaybeLater,
}: DealsOnboardingModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Illustration Area */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-t-lg p-8 pb-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Progress Bar Icon */}
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-2">
              <div className="w-6 h-6 bg-white rounded-sm"></div>
            </div>

            {/* Speech Bubble */}
            <div className="bg-white rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
              <span className="text-gray-900 font-semibold">Closed deals: +1</span>
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </div>

            {/* Three Circular Icons */}
            <div className="flex items-center gap-3 mt-4">
              {/* Apollo Logo (Yellow) */}
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>

              {/* Workflow Icon (Orange) */}
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>

              {/* Salesforce/Cloud Icon (Light Blue) */}
              <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Deal management made easy
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Set up your sales pipeline and track activities for your entire sales cycle with NextDeal Deals. Use NextDeal as your CRM or sync with HubSpot.
          </p>

          {/* Features List */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Get actionable insights to push deals forward
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Use seamlessly with other NextDeal tools to simplify workflows
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                Automate deal updates and follow-ups to reduce manual tasks
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBeginSetup}
              className="flex-1 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              Begin setup
            </button>
            <button
              onClick={onMaybeLater}
              className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

