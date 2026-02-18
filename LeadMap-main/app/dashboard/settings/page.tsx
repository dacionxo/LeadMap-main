'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { Icon } from '@iconify/react'
import { ArrowRight, Moon, Sun, Monitor, Zap } from 'lucide-react'
import AppNavSidebar from '../components/AppNavSidebar'
import DealsNavbar from '../crm/deals/components/DealsNavbar'
import CalendarSettings from './components/CalendarSettings'
import EmailAccountsSettings from './components/EmailAccountsSettings'
import Mailboxes from './components/Mailboxes'
import './settings.css'

const BIO_MAX_LENGTH = 275
/* Reference design tokens (1:1 with provided HTML) */
const SETTINGS_PRIMARY = '#3B82F6'
const SETTINGS_PRIMARY_DARK = '#2563EB'

type SettingsTab = 'account' | 'security' | 'notifications' | 'billing' | 'integrations'

const NAV_ITEMS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'account', label: 'Account', icon: 'material-symbols:person-outline' },
  { id: 'security', label: 'Security', icon: 'material-symbols:lock-outline' },
  { id: 'notifications', label: 'Notifications', icon: 'material-symbols:notifications-outline' },
  { id: 'billing', label: 'Billing', icon: 'material-symbols:credit-card-outline' },
  { id: 'integrations', label: 'Integrations', icon: 'material-symbols:grid-view-outline' },
]

function parseDisplayName(name: string | undefined): { firstName: string; lastName: string } {
  if (!name || !name.trim()) return { firstName: '', lastName: '' }
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  return { firstName, lastName }
}

export default function SettingsPage() {
  const { profile, user } = useApp()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const router = useRouter()

  const { firstName: initialFirst, lastName: initialLast } = parseDisplayName(profile?.name)
  const [firstName, setFirstName] = useState(initialFirst)
  const [lastName, setLastName] = useState(initialLast)
  const [email, setEmail] = useState(profile?.email ?? '')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [bio, setBio] = useState('')

  const avatarUrl = (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null
  const initial = profile?.name?.charAt(0).toUpperCase() || 'U'
  const bioLeft = Math.max(0, BIO_MAX_LENGTH - bio.length)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !profile) {
      router.push('/')
    }
  }, [mounted, profile, router])

  useEffect(() => {
    const { firstName: f, lastName: l } = parseDisplayName(profile?.name)
    setFirstName(f)
    setLastName(l)
    setEmail(profile?.email ?? '')
  }, [profile?.name, profile?.email])

  const handleCancel = useCallback(() => {
    const { firstName: f, lastName: l } = parseDisplayName(profile?.name)
    setFirstName(f)
    setLastName(l)
    setEmail(profile?.email ?? '')
  }, [profile?.name, profile?.email])

  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      // TODO: call profile update API when available; for now no-op
    },
    []
  )

  if (!mounted) return null
  if (!profile) return null

  const showProfileFooter = activeTab === 'account'

  return (
    <DashboardLayout fullBleed hideHeader>
      <div className="-mt-[30px]">
        <div
          data-settings="page-wrap"
          className="settings-mesh-gradient font-sans fixed top-0 bottom-0 left-0 right-0 flex flex-col bg-mesh dark:bg-dark overflow-hidden text-slate-800 dark:text-slate-200"
        >
          <DealsNavbar />
          <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0 min-w-0">
            <div className="flex flex-row h-full min-h-0 overflow-hidden gap-0">
              <AppNavSidebar />
              <div className="flex-1 bg-white dark:bg-dark/90 rounded-r-[20px] rounded-l-[0] shadow-sm border border-l-0 border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-0 overflow-hidden relative">
                <div
                  className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"
                  aria-hidden
                />
                <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
                  <div
                    data-settings="glass-panel"
                    className="settings-glass-panel w-full h-full rounded-2xl shadow-card-soft overflow-hidden flex flex-col md:flex-row flex-1 min-h-0 relative border border-slate-200/60 dark:border-slate-700/60"
                  >
          {/* Top gradient bar */}
          <div
            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-300 via-[#3B82F6] to-purple-300 opacity-30 z-10 rounded-t-3xl"
            aria-hidden
          />

          {/* Sidebar */}
          <aside
            data-settings="sidebar"
            className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-slate-700/60 p-6 md:p-8 flex-shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md"
          >
            <div className="mb-10 pl-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SETTINGS_PRIMARY }} aria-hidden />
                Settings
              </h2>
            </div>
            <nav className="space-y-2" role="navigation" aria-label="Settings sections">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-settings="nav-item"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium w-full text-left text-sm ${
                      isActive
                        ? 'text-[#3B82F6]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                    }`}
                    style={isActive ? { backgroundColor: `${SETTINGS_PRIMARY}1A` } : undefined}
                  >
                    <Icon icon={item.icon} className="w-5 h-5 shrink-0" aria-hidden />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white/20 dark:bg-slate-900/20 relative min-h-0">
            <header className="px-8 pt-10 pb-6 border-b border-slate-200/40 dark:border-slate-700/40 flex-shrink-0">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'account' && 'Profile Settings'}
                {activeTab === 'security' && 'Security'}
                {activeTab === 'notifications' && 'Notifications'}
                {activeTab === 'billing' && 'Billing'}
                {activeTab === 'integrations' && 'Integrations'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                {activeTab === 'account' && 'Update your personal information and preferences'}
                {activeTab === 'security' && 'Password and account security'}
                {activeTab === 'notifications' && 'Email and in-app notification preferences'}
                {activeTab === 'billing' && 'Manage subscription and payment methods'}
                {activeTab === 'integrations' && 'Connect external services and tools'}
              </p>
            </header>

            <div
              data-settings="content-scroll"
              className="flex-1 overflow-y-auto px-8 py-8 min-h-0 custom-scrollbar"
            >
              {activeTab === 'account' && (
                <>
                  <div
                    data-settings="profile-card"
                    className="flex items-center gap-8 mb-10 p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm"
                  >
                    <div className="relative group">
                      <div className="p-1 rounded-full border-2 border-[#3B82F6]/20 bg-white dark:bg-slate-800 shadow-sm">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="w-24 h-24 rounded-full object-cover"
                            data-settings="profile-avatar"
                          />
                        ) : (
                          <div
                            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
                            style={{ backgroundColor: `${SETTINGS_PRIMARY}33`, color: SETTINGS_PRIMARY }}
                            data-settings="profile-initial"
                            aria-hidden
                          >
                            {initial}
                          </div>
                        )}
                      </div>
                      <span
                        className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800"
                        aria-hidden
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Profile Picture
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-1 font-medium">
                        Supports PNG, JPG up to 10MB
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center px-6 py-2.5 text-white rounded-full text-sm font-semibold transition-all settings-shadow-glow hover:shadow-lg transform active:scale-95"
                          style={{ backgroundColor: SETTINGS_PRIMARY }}
                          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = SETTINGS_PRIMARY_DARK }}
                          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = SETTINGS_PRIMARY }}
                          aria-label="Update profile photo"
                        >
                          <Icon icon="material-symbols:upload-outline" className="w-[18px] h-[18px] mr-2" aria-hidden />
                          Update Photo
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center px-4 py-2.5 text-slate-500 dark:text-slate-400 hover:text-red-500 text-sm font-medium transition-colors"
                          aria-label="Remove profile photo"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  <form id="settings-form" className="space-y-8" onSubmit={handleSave} data-settings="form">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1"
                          htmlFor="settings-firstName"
                        >
                          First Name
                        </label>
                        <input
                          id="settings-firstName"
                          name="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          data-settings="input-glass"
                          className="settings-input-glass block w-full rounded-xl border border-slate-200/80 dark:border-slate-600/80 shadow-sm focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 px-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1"
                          htmlFor="settings-lastName"
                        >
                          Last Name
                        </label>
                        <input
                          id="settings-lastName"
                          name="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          data-settings="input-glass"
                          className="settings-input-glass block w-full rounded-xl border border-slate-200/80 dark:border-slate-600/80 shadow-sm focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 px-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1"
                          htmlFor="settings-email"
                        >
                          Email Address
                        </label>
                        <div className="relative rounded-md shadow-sm group">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Icon
                              icon="material-symbols:mail-outline"
                              className="w-5 h-5 text-slate-400 group-focus-within:text-[#3B82F6] transition-colors"
                              aria-hidden
                            />
                          </div>
                          <input
                            id="settings-email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            data-settings="input-glass"
                            className="settings-input-glass block w-full rounded-xl border border-slate-200/80 dark:border-slate-600/80 pl-11 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label
                          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1"
                          htmlFor="settings-phone"
                        >
                          Phone Number
                        </label>
                        <div className="relative rounded-md shadow-sm group">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Icon
                              icon="material-symbols:call-outline"
                              className="w-5 h-5 text-slate-400 group-focus-within:text-[#3B82F6] transition-colors"
                              aria-hidden
                            />
                          </div>
                          <input
                            id="settings-phone"
                            name="phone"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            data-settings="input-glass"
                            className="settings-input-glass block w-full rounded-xl border border-slate-200/80 dark:border-slate-600/80 pl-11 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 text-slate-700 dark:text-slate-200 placeholder-slate-400 font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label
                          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1"
                          htmlFor="settings-jobTitle"
                        >
                          Job Title
                        </label>
                        <input
                          id="settings-jobTitle"
                          name="jobTitle"
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Senior Product Manager"
                          data-settings="input-glass"
                          className="settings-input-glass block w-full rounded-xl border border-slate-200/80 dark:border-slate-600/80 shadow-sm focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 px-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 font-medium"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label
                          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1"
                          htmlFor="settings-bio"
                        >
                          Bio
                        </label>
                        <div className="relative">
                          <textarea
                            id="settings-bio"
                            name="bio"
                            rows={4}
                            value={bio}
                            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                            placeholder="Tell us a bit about yourself..."
                            data-settings="input-glass"
                            className="settings-input-glass block w-full rounded-xl border border-slate-200/80 dark:border-slate-600/80 shadow-sm focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 px-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 font-medium resize-none"
                          />
                          <span className="absolute bottom-3 right-3 text-xs text-slate-400 dark:text-slate-500 font-medium bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
                            {bioLeft} left
                          </span>
                        </div>
                      </div>
                    </div>
                  </form>
                  <div className="h-24" aria-hidden />
                </>
              )}

              {activeTab === 'security' && (
                <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm max-w-xl">
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Change password and manage session security. Full security controls coming soon.
                  </p>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm max-w-xl">
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Choose how you receive email and in-app notifications.
                  </p>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm max-w-xl">
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-4">
                    Manage your subscription and payment methods.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/billing')}
                    className="inline-flex items-center justify-center px-6 py-2.5 text-white rounded-full text-sm font-semibold transition-all shadow-lg"
                    style={{ backgroundColor: SETTINGS_PRIMARY, boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = SETTINGS_PRIMARY_DARK }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = SETTINGS_PRIMARY }}
                    aria-label="Go to Billing page"
                  >
                    Go to Billing
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
                  </button>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-4">
                      Connect your CRM, email providers, and other tools.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/tools/integrations')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      Manage Integrations
                      <ArrowRight className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                  <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-6 h-6 text-slate-700 dark:text-slate-300" aria-hidden />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Webhooks
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-4">
                      Set up webhooks to receive leads from external systems.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/tools/webhooks')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      Manage Webhooks
                      <ArrowRight className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                  {/* Appearance & calendar/email - kept from original */}
                  <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                      Appearance
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-4">
                      Choose your preferred theme.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          theme === 'light'
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                            : 'border-white/60 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/50'
                        }`}
                        aria-pressed={theme === 'light'}
                      >
                        <Sun className="w-5 h-5" aria-hidden />
                        <span className="font-medium">Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                            : 'border-white/60 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/50'
                        }`}
                        aria-pressed={theme === 'dark'}
                      >
                        <Moon className="w-5 h-5" aria-hidden />
                        <span className="font-medium">Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          theme === 'system'
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                            : 'border-white/60 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/50'
                        }`}
                        aria-pressed={theme === 'system'}
                      >
                        <Monitor className="w-5 h-5" aria-hidden />
                        <span className="font-medium">System</span>
                      </button>
                    </div>
                    {theme === 'system' && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Currently using: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode (from system settings)
                      </p>
                    )}
                  </div>
                  <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                    <CalendarSettings />
                  </div>
                  <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                    <EmailAccountsSettings />
                  </div>
                  <div className="p-6 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                    <Mailboxes />
                  </div>
                </div>
              )}
            </div>

            {/* Sticky footer - Account tab only */}
            {showProfileFooter && (
              <footer
                data-settings="footer"
                className="absolute bottom-0 left-0 right-0 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 flex items-center justify-end gap-4 rounded-br-3xl flex-shrink-0"
              >
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-700/50 rounded-full transition-colors"
                  aria-label="Cancel changes"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="settings-form"
                  className="px-8 py-2.5 text-sm font-bold text-white rounded-full shadow-lg transition-all hover:-translate-y-0.5 transform active:scale-95"
                  style={{ backgroundColor: SETTINGS_PRIMARY, boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = SETTINGS_PRIMARY_DARK; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.4)' }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = SETTINGS_PRIMARY; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}
                  aria-label="Save profile changes"
                >
                  Save Changes
                </button>
              </footer>
            )}
          </div>
        </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
