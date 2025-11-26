'use client'

import { X, MapPin, Zap, Search, Navigation } from 'lucide-react'

interface MapsOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onBeginSetup: () => void
  onMaybeLater: () => void
}

export default function MapsOnboardingModal({
  isOpen,
  onClose,
  onBeginSetup,
  onMaybeLater,
}: MapsOnboardingModalProps) {
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
            <div className="w-full max-w-md relative">
              <div className="bg-blue-600 h-2 rounded-full mb-2 relative">
                <div className="bg-blue-400 h-2 rounded-full w-3/4"></div>
                <div className="absolute left-0 top-0 w-4 h-4 bg-white rounded-full -mt-1 -ml-2 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Main Illustration */}
            <div className="mt-8 flex flex-col items-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 mb-4 relative">
                <div className="bg-white rounded-full p-4">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-green-600 mx-auto" />
                    <div className="text-xs text-gray-600 mt-2">Maps active</div>
                  </div>
                </div>
                {/* Decorative stars */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Search className="w-4 h-4 text-yellow-800" />
                </div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-yellow-800" />
                </div>
              </div>

              {/* Integration icons */}
              <div className="flex items-center space-x-3 mt-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <Navigation className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Visualize your property leads on a map
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Explore properties visually, filter by location, and identify the best opportunities in your target areas. Use LeadMap Maps to see all your leads, expired listings, and prospects in one interactive view.
          </p>

          {/* Features List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Here's what you can do:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  View all your property leads on an interactive map with Google Maps and Mapbox integration
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Filter properties by type, price, location, and other criteria to find the best opportunities
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                  <Search className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Search for properties by address, zip code, city, or county to quickly locate specific areas
                </span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onBeginSetup}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
            >
              Begin setup
            </button>
            <button
              onClick={onMaybeLater}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

