'use client'

import { Check, ExternalLink, Calendar } from 'lucide-react'

interface CalendarOnboardingViewProps {
  onDateSelect?: (date: Date, time: string) => void
  onConnectCalendar?: () => void
}

export default function CalendarOnboardingView({ onDateSelect, onConnectCalendar }: CalendarOnboardingViewProps) {
  // Note: Left panel is now just an image - no interactive elements

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Image/Visual (50% width) */}
      <div className="w-1/2 flex items-center justify-center bg-gradient-to-br from-purple-100 via-purple-50 to-white dark:from-purple-900/30 dark:via-purple-900/20 dark:to-gray-900 p-12">
        <div className="w-full h-full flex items-center justify-center">
          {/* Calendar illustration image */}
          <div className="w-full max-w-2xl">
            <img
              src="/images/calendar-onboarding.svg"
              alt="Calendar scheduling illustration"
              className="w-full h-auto object-contain"
              onError={(e) => {
                // Fallback to a placeholder if image doesn't exist
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement
                if (fallback) {
                  fallback.style.display = 'flex'
                }
              }}
            />
            {/* Fallback placeholder if image doesn't exist */}
            <div className="hidden w-full h-full min-h-[500px] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-32 h-32 mx-auto mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Schedule Smarter
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Manage your meetings and events with ease. Connect your calendar to get started.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Features (50% width) */}
      <div className="w-1/2 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-8 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Simplify scheduling and run more effective meetings
          </h1>

          {/* Conferencing Apps */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Works with conferencing apps</p>
            <div className="flex items-center justify-center gap-3">
              {/* Google Meet */}
              <div className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  GM
                </div>
              </div>
              {/* Zoom */}
              <div className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  Z
                </div>
              </div>
              {/* Microsoft Teams */}
              <div className="flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  MS
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-4 mb-8 w-full">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300 text-left">
                Let customers easily book meetings through your booking link
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300 text-left">
                Get AI-powered insights to prep for upcoming meetings
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300 text-left">
                Link meetings to contacts and accounts to view history in one place
              </p>
            </div>
          </div>

          {/* Connect Calendar Button */}
          <button
            onClick={onConnectCalendar}
            className="w-full px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            Connect calendar
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

