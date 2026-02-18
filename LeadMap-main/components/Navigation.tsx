'use client'

import { memo } from 'react'
import { useApp } from '@/app/providers'
import { MapPin, LogOut, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

function Navigation() {
  const { user, profile, signOut } = useApp()
  const router = useRouter()

  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null
  const initial = profile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getPlanBadge = () => {
    if (!profile) return null

    if (profile.is_subscribed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
          <Crown className="w-3 h-3 mr-1" />
          {profile.plan_tier === 'pro' ? 'Pro' : 'Starter'}
        </span>
      )
    }

    const trialEnd = new Date(profile.trial_end)
    const now = new Date()
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300">
          {daysLeft} days left
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-300">
        Trial Expired
      </span>
    )
  }

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-primary-500" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">NextDeal</span>
          </div>

          <div className="flex items-center space-x-4">
            {getPlanBadge()}
            
            <ThemeToggle />
            
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {profile?.name || user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default memo(Navigation)
