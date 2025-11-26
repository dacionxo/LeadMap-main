'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ConnectCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect?: (email: string) => void
  onUseNative?: () => void
}

export default function ConnectCalendarModal({ isOpen, onClose, onConnect, onUseNative }: ConnectCalendarModalProps) {
  const [email, setEmail] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsConnecting(true)
    try {
      // Initiate OAuth flow based on email domain
      const response = await fetch('/api/calendar/oauth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate calendar connection')
      }

      const data = await response.json()
      
      if (data.error) {
        // Handle Exchange Server or other errors
        alert(data.error)
        setIsConnecting(false)
        return
      }

      // Redirect to OAuth provider
      if (data.authUrl) {
        // Store email in sessionStorage for callback
        sessionStorage.setItem('calendar_connect_email', email.trim())
        window.location.href = data.authUrl
      } else {
        throw new Error('No authentication URL received')
      }
    } catch (error: any) {
      console.error('Error connecting calendar:', error)
      alert(error.message || 'Failed to connect calendar. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleCancel = () => {
    setEmail('')
    onClose()
  }

  const handleUseNative = () => {
    if (onUseNative) {
      onUseNative()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Connect your calendar
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Connect your Google or Microsoft (365, Outlook, Exchange) calendar to sync events and manage your schedule seamlessly.
          </p>

          {/* Email Input */}
          <div className="mb-6">
            <label htmlFor="calendar-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              id="calendar-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your calendar email address"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            By clicking "Connect" below, I acknowledge that business contact data submitted from my calendar to NextDeal may be used to provide and improve NextDeal's services as further described in our{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline underline"
            >
              Terms of Service
            </a>
            {' '}and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline underline"
            >
              Privacy Policy
            </a>
            .
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUseNative}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Use native calendar
            </button>
            <button
              type="submit"
              disabled={!email.trim() || isConnecting}
              className="px-4 py-2 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

