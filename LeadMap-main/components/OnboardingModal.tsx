'use client'

import { X, BarChart3, Zap, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

interface OnboardingModalProps {
  title: string
  description: string
  features: Array<{
    icon: React.ReactNode
    text: string
  }>
  illustration?: React.ReactNode
  onBeginSetup?: () => void
  onMaybeLater?: () => void
  storageKey: string
}

export default function OnboardingModal({
  title,
  description,
  features,
  illustration,
  onBeginSetup,
  onMaybeLater,
  storageKey
}: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Guard for SSR - only access localStorage on client
    if (typeof window === 'undefined') return
    
    setMounted(true)
    // Check if user has dismissed this modal before
    const hasSeenModal = localStorage.getItem(storageKey)
    if (!hasSeenModal) {
      setIsOpen(true)
    }
  }, [storageKey])

  const handleClose = () => {
    setIsOpen(false)
    // Guard for SSR
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true')
    }
    onMaybeLater?.()
  }

  const handleBeginSetup = () => {
    setIsOpen(false)
    // Guard for SSR
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true')
    }
    onBeginSetup?.()
  }

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted || !isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Illustration Section - Green Background */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-8 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md">
            <div className="bg-blue-600 h-2 rounded-full mb-2 relative">
              <div className="bg-blue-400 h-2 rounded-full w-3/4"></div>
              <div className="absolute left-0 top-0 w-4 h-4 bg-white rounded-full -mt-1 -ml-2 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Main Illustration */}
          {illustration || (
            <div className="mt-8 flex flex-col items-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 mb-4 relative">
                <div className="bg-white rounded-full p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">+1</div>
                    <div className="text-xs text-gray-600 mt-1">Completed</div>
                  </div>
                </div>
                {/* Decorative stars */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-yellow-800" />
                </div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-yellow-800" />
                </div>
              </div>

              {/* Integration icons */}
              <div className="flex items-center space-x-3 mt-4">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {description}
          </p>

          {/* Features List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Here's what you can do:
            </h3>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                    {feature.icon}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBeginSetup}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
            >
              Begin setup
            </button>
            <button
              onClick={handleClose}
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

