'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useRouter } from 'next/navigation'
import { useApp } from '@/app/providers'
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { Moon, Sun, Monitor, ArrowRight, Zap } from 'lucide-react'
import CalendarSettings from './components/CalendarSettings'
import EmailAccountsSettings from './components/EmailAccountsSettings'
import Mailboxes from './components/Mailboxes'
import './settings.css'

const SETTINGS_PRIMARY = '#3B82F6'
const SLATE_MAIN = '#0F172A'
const SLATE_MUTED = '#64748B'
const SOFT_BORDER = '#E2E8F0'

type SettingsTab = 'profile' | 'security' | 'notifications' | 'billing' | 'integrations' | 'preferences' | 'data-privacy'

const NAV_ITEMS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'billing', label: 'Billing', icon: 'credit_card' },
  { id: 'integrations', label: 'Integrations', icon: 'grid_view' },
  { id: 'preferences', label: 'Preferences', icon: 'tune' },
  { id: 'data-privacy', label: 'Data & privacy', icon: 'shield' },
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
  const { profile } = useApp()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const router = useRouter()

  const { firstName: initialFirst, lastName: initialLast } = parseDisplayName(profile?.name)
  const [firstName, setFirstName] = useState(initialFirst)
  const [lastName, setLastName] = useState(initialLast)
  const [email, setEmail] = useState(profile?.email ?? '')
  const [phone, setPhone] = useState('')

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

  if (!mounted) return null
  if (!profile) return null

  const showProfileFooter = activeTab === 'profile'

  return (
    <DashboardLayout>
      <div className="settings-page-wrap settings-mesh-gradient min-h-full font-sans text-slate-800 flex items-center justify-center p-4 md:p-8">
        <div className="settings-glass-panel settings-shadow-card w-full max-w-6xl rounded-[1.5rem] overflow-hidden flex flex-col md:flex-row min-h-[750px] relative bg-white/70">
          {/* Top gradient bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-300 via-[#3B82F6] to-purple-300 opacity-30" />

          {/* Sidebar */}
          <div
            className="w-full md:w-72 border-b md:border-b-0 md:border-r p-6 md:p-8 flex-shrink-0 bg-white/40 backdrop-blur-md"
            style={{ borderColor: `${SOFT_BORDER}99` }}
          >
            <div className="mb-10 pl-2">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: SLATE_MAIN }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SETTINGS_PRIMARY }} />
                Settings
              </h2>
            </div>
            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium w-full text-left text-sm ${
                      isActive
                        ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white/20 relative">
            <div className="px-8 pt-10 pb-6 border-b flex-shrink-0" style={{ borderColor: `${SOFT_BORDER}66` }}>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: SLATE_MAIN }}>
                {activeTab === 'profile' && 'Profile Settings'}
                {activeTab === 'security' && 'Security'}
                {activeTab === 'notifications' && 'Notifications'}
                {activeTab === 'billing' && 'Billing'}
                {activeTab === 'integrations' && 'Integrations'}
                {activeTab === 'preferences' && 'Preferences'}
                {activeTab === 'data-privacy' && 'Data & privacy'}
              </h1>
              <p className="text-sm mt-2 font-medium" style={{ color: SLATE_MUTED }}>
                {activeTab === 'profile' && 'Update your personal information and preferences'}
                {activeTab === 'security' && 'Password and account security'}
                {activeTab === 'notifications' && 'Email and in-app notification preferences'}
                {activeTab === 'billing' && 'Manage subscription and payment methods'}
                {activeTab === 'integrations' && 'Connect external services and tools'}
                {activeTab === 'preferences' && 'Appearance, calendar, and email settings'}
                {activeTab === 'data-privacy' && 'Export data and privacy options'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 min-h-0">
              {activeTab === 'profile' && (
                <>
                  <div className="flex items-center gap-8 mb-10 p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                    <div className="relative group">
                      <div className="p-1 rounded-full border-2 border-[#3B82F6]/20 bg-white shadow-sm">
                        <div
                          className="w-24 h-24 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-3xl font-bold text-[#3B82F6]"
                          aria-hidden
                        >
                          {profile?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold" style={{ color: SLATE_MAIN }}>
                        Profile Picture
                      </h3>
                      <p className="text-sm text-slate-500 mb-4 mt-1 font-medium">
                        Supports PNG, JPG up to 10MB
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center px-6 py-2.5 text-white rounded-full text-sm font-semibold hover:opacity-90 transition-all settings-shadow-glow hover:shadow-lg transform active:scale-95"
                          style={{ backgroundColor: SETTINGS_PRIMARY }}
                        >
                          <span className="material-symbols-outlined text-[18px] mr-2">upload</span>
                          Update Photo
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center px-4 py-2.5 text-slate-500 hover:text-red-500 text-sm font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                  <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 ml-1" htmlFor="firstName">
                          First Name
                        </label>
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="settings-input-glass block w-full rounded-xl border shadow-sm focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 px-4 text-slate-700 placeholder-slate-400 font-medium"
                          style={{ borderColor: `${SOFT_BORDER}cc` }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 ml-1" htmlFor="lastName">
                          Last Name
                        </label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="settings-input-glass block w-full rounded-xl border shadow-sm focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 px-4 text-slate-700 placeholder-slate-400 font-medium"
                          style={{ borderColor: `${SOFT_BORDER}cc` }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 ml-1" htmlFor="email">
                          Email Address
                        </label>
                        <div className="relative rounded-md shadow-sm group">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <span className="material-symbols-outlined text-slate-400 text-[20px] group-focus-within:text-[#3B82F6] transition-colors">
                              mail
                            </span>
                          </div>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="settings-input-glass block w-full rounded-xl border pl-11 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 text-slate-700 placeholder-slate-400 font-medium"
                            style={{ borderColor: `${SOFT_BORDER}cc` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 ml-1" htmlFor="phone">
                          Phone Number
                        </label>
                        <div className="relative rounded-md shadow-sm group">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <span className="material-symbols-outlined text-slate-400 text-[20px] group-focus-within:text-[#3B82F6] transition-colors">
                              call
                            </span>
                          </div>
                          <input
                            id="phone"
                            name="phone"
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="settings-input-glass block w-full rounded-xl border pl-11 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 text-slate-700 placeholder-slate-400 font-medium"
                            style={{ borderColor: `${SOFT_BORDER}cc` }}
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                  <div className="h-24" />
                </>
              )}

              {activeTab === 'security' && (
                <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm max-w-xl">
                  <p className="text-sm text-slate-600 font-medium">
                    Change password and manage session security. Full security controls coming soon.
                  </p>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm max-w-xl">
                  <p className="text-sm text-slate-600 font-medium">
                    Choose how you receive email and in-app notifications.
                  </p>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm max-w-xl">
                  <p className="text-sm text-slate-600 font-medium mb-4">
                    Manage your subscription and payment methods.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/billing')}
                    className="inline-flex items-center justify-center px-6 py-2.5 text-white rounded-full text-sm font-semibold hover:opacity-90 transition-all"
                    style={{ backgroundColor: SETTINGS_PRIMARY }}
                  >
                    Go to Billing
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                    <p className="text-sm text-slate-600 font-medium mb-4">
                      Connect your CRM, email providers, and other tools.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/tools/integrations')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      Manage Integrations
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-6 h-6 text-slate-700" />
                      <h3 className="text-lg font-semibold" style={{ color: SLATE_MAIN }}>
                        Webhooks
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-4">
                      Set up webhooks to receive leads from external systems.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/tools/webhooks')}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      Manage Webhooks
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: SLATE_MAIN }}>
                      Appearance
                    </h3>
                    <p className="text-sm text-slate-600 font-medium mb-4">
                      Choose your preferred theme.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          theme === 'light'
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                            : 'border-white/60 text-slate-600 hover:bg-white/60'
                        }`}
                      >
                        <Sun className="w-5 h-5" />
                        <span className="font-medium">Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                            : 'border-white/60 text-slate-600 hover:bg-white/60'
                        }`}
                      >
                        <Moon className="w-5 h-5" />
                        <span className="font-medium">Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          theme === 'system'
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                            : 'border-white/60 text-slate-600 hover:bg-white/60'
                        }`}
                      >
                        <Monitor className="w-5 h-5" />
                        <span className="font-medium">System</span>
                      </button>
                    </div>
                    {theme === 'system' && (
                      <p className="text-xs text-slate-500 mt-2">
                        Currently using: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode (from system settings)
                      </p>
                    )}
                  </div>
                  <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                    <CalendarSettings />
                  </div>
                  <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                    <EmailAccountsSettings />
                  </div>
                  <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm">
                    <Mailboxes />
                  </div>
                </div>
              )}

              {activeTab === 'data-privacy' && (
                <div className="p-6 bg-white/40 rounded-2xl border border-white/50 shadow-sm backdrop-blur-sm max-w-xl">
                  <p className="text-sm text-slate-600 font-medium">
                    Export your data or manage privacy options. Full controls coming soon.
                  </p>
                </div>
              )}
            </div>

            {/* Sticky footer - Profile tab only */}
            {showProfileFooter && (
              <div
                className="absolute bottom-0 left-0 right-0 border-t bg-white/60 backdrop-blur-md p-6 flex items-center justify-end gap-4 rounded-br-[1.5rem] flex-shrink-0"
                style={{ borderColor: `${SOFT_BORDER}80` }}
              >
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-8 py-2.5 text-sm font-bold text-white rounded-full shadow-lg transition-all hover:-translate-y-0.5 transform active:scale-95"
                  style={{
                    backgroundColor: SETTINGS_PRIMARY,
                    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
