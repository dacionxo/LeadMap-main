'use client'

import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/app/providers'
import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { useSidebar } from './SidebarContext'

export default function Header() {
  const { profile, signOut } = useApp()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const router = useRouter()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    if (showProfileMenu || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu, showNotifications])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getTrialStatus = () => {
    if (!profile) return null

    if (profile.is_subscribed) {
      return (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg pulse-glow">
          <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
          Active
        </span>
      )
    }

    const trialEnd = new Date(profile.trial_end)
    const now = new Date()
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft > 0) {
      return (
        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg">
          {daysLeft} days left
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
        Trial Expired
      </span>
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search results or perform search
      router.push(`/dashboard/prospect-enrich?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const { toggle } = useSidebar()

  return (
    <header className="sticky top-0 z-[2] bg-transparent dark:bg-transparent">
      <nav className="px-2 dark:border-gray-700 rounded-none bg-transparent dark:bg-transparent py-4 sm:px-6">
        <div className="mx-auto flex flex-wrap items-center justify-between">
          {/* Mobile Menu Toggle */}
          <span
            onClick={toggle}
            className="px-[15px] hover:text-primary dark:hover:text-primary text-link dark:text-darklink relative after:absolute after:w-10 after:h-10 after:rounded-full hover:after:bg-lightprimary after:bg-transparent rounded-full xl:hidden flex justify-center items-center cursor-pointer"
          >
            <Icon icon="tabler:menu-2" height={20} />
          </span>

          {/* Desktop Toggle and Search */}
          <div className="xl:!block !hidden">
            <div className="flex gap-0 items-center relative">
              <span
                onClick={toggle}
                className="px-[15px] relative after:absolute after:w-10 after:h-10 after:rounded-full hover:after:bg-lightprimary after:bg-transparent text-link hover:text-primary dark:text-darklink dark:hover:text-primary rounded-full justify-center items-center cursor-pointer xl:flex hidden"
              >
                <Icon icon="tabler:menu-2" height={20} />
              </span>

              {/* Global Search Bar */}
              <div className="flex-1 max-w-2xl mx-4">
                <form onSubmit={handleSearch} className="relative">
                  <button
                    type="button"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 px-[15px] hover:text-primary text-link dark:text-darklink dark:hover:text-primary relative after:absolute after:w-10 after:h-10 after:rounded-full hover:after:bg-lightprimary after:bg-transparent rounded-full flex justify-center items-center cursor-pointer"
                  >
                    <Icon icon="solar:magnifer-line-duotone" height={20} />
                  </button>
                  <input
                    type="text"
                    placeholder="Search NextDeal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="w-full pl-12 pr-4 py-2 bg-transparent dark:bg-transparent border border-border dark:border-darkborder rounded-md text-link dark:text-darklink placeholder:text-link dark:placeholder:text-darklink focus:outline-none focus:ring-0 focus:border-primary dark:focus:border-primary transition-all duration-200 text-sm"
                  />
                </form>
              </div>
            </div>
          </div>

          {/* Mobile Logo */}
          <div className="block xl:hidden">
            <img
              src="/nextdeal-logo.png"
              alt="NextDeal"
              className="h-6 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>

          {/* Right Side Actions */}
          <div className="xl:!block !hidden md:!hidden">
            <div className="flex gap-0 items-center">

              {/* Trial Status */}
              {getTrialStatus() && (
                <div className="px-4">
                  {getTrialStatus()}
                </div>
              )}

              {/* Theme Toggle */}
              {theme === "light" ? (
                <div
                  className="hover:text-primary px-4 dark:hover:text-primary focus:ring-0 rounded-full flex justify-center items-center cursor-pointer text-link dark:text-darklink group relative"
                  onClick={() => setTheme('dark')}
                >
                  <span className="flex items-center justify-center relative after:absolute after:w-10 after:h-10 after:rounded-full after:-top-1/2 group-hover:after:bg-lightprimary">
                    <Icon icon="tabler:moon" width="20" />
                  </span>
                </div>
              ) : (
                <div
                  className="hover:text-primary px-4 dark:hover:text-primary focus:ring-0 rounded-full flex justify-center items-center cursor-pointer text-link dark:text-darklink group relative"
                  onClick={() => setTheme('light')}
                >
                  <span className="flex items-center justify-center relative after:absolute after:w-10 after:h-10 after:rounded-full after:-top-1/2 group-hover:after:bg-lightprimary">
                    <Icon icon="solar:sun-bold-duotone" width="20" />
                  </span>
                </div>
              )}

              {/* Notifications */}
              <div className="relative group/menu px-4" ref={notificationsRef}>
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    setShowProfileMenu(false)
                  }}
                  className="relative"
                >
                  <span className="relative after:absolute after:w-10 after:h-10 after:rounded-full hover:text-primary after:-top-1/2 hover:after:bg-lightprimary text-link dark:text-darklink rounded-full flex justify-center items-center cursor-pointer group-hover/menu:after:bg-lightprimary group-hover/menu:!text-primary">
                    <Icon icon="tabler:bell-ringing" height={20} />
                  </span>
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-screen sm:w-[360px] bg-white dark:bg-dark shadow-md dark:shadow-dark-md rounded-sm py-6 z-50">
                    <div className="flex items-center px-6 justify-between">
                      <h3 className="mb-0 text-lg font-semibold text-ld">Notification</h3>
                    </div>
                    <div className="px-6 py-4 max-h-80 overflow-y-auto">
                      <p className="text-sm text-link dark:text-darklink">No new notifications</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative group/menu ps-4" ref={menuRef}>
                <button
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu)
                    setShowNotifications(false)
                  }}
                  className="hover:text-primary hover:bg-lightprimary rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-lightprimary group-hover/menu:text-primary"
                >
                  <div className="flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-screen sm:w-[360px] bg-white dark:bg-dark shadow-md dark:shadow-dark-md rounded-sm py-6 z-50">
                    {/* User Info */}
                    <div className="px-6">
                      <h3 className="text-lg font-semibold text-ld">User Profile</h3>
                      <div className="flex items-center gap-6 pb-5 border-b border-border dark:border-darkborder mt-5 mb-3">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-base font-bold text-white shadow-sm">
                          {profile?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h5 className="card-title text-sm mb-0.5 font-medium">
                            {profile?.name || 'User'}
                          </h5>
                          <p className="card-subtitle font-normal text-muted mb-0 mt-1 flex items-center">
                            <Icon icon="tabler:mail" className="text-base me-1 relative top-0.5" />
                            {profile?.email || 'user@example.com'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="px-6 py-2">
                      <button
                        onClick={() => {
                          router.push('/dashboard/settings')
                          setShowProfileMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-link dark:text-darklink hover:text-primary bg-hover rounded-md transition-colors"
                      >
                        <Icon icon="solar:user-circle-linear" className="h-5 w-5" />
                        <span>Profile Settings</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          router.push('/pricing')
                          setShowProfileMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-link dark:text-darklink hover:text-primary bg-hover rounded-md transition-colors"
                      >
                        <Icon icon="solar:card-linear" className="h-5 w-5" />
                        <span>Billing & Plans</span>
                      </button>

                      <div className="border-t border-border dark:border-darkborder my-2" />
                      
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error/10 rounded-md transition-colors"
                      >
                        <Icon icon="tabler:power" className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Toggle Icon */}
          <span
            className="h-10 w-10 flex xl:hidden hover:text-primary hover:bg-lightprimary rounded-full justify-center items-center cursor-pointer"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <Icon icon="tabler:dots" height={21} />
          </span>
        </div>
      </nav>
    </header>
  )
}
