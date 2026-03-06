'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'

const GOOGLE_CALENDAR_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCa7PIKbcfmvd7WfqyyWwQbYGpIqrjgnGn_VIXLZLPt_8FTDCfqzLJiaukE5WC4rJxn3glbyfhzOedv22Az6fgeljGBk96N8M0uCbS6bmpbMPgXNrnYai0_ig9UdEjZgNjIaxZAbYE2BDemFx9FyP02PIqjwYeTvx8Lq1VW5VjV4qIynXpA29A1I5OY5Ptldeqo8yu6FhGAEUVckc1DCQBwwhKXvvufTNOdO4UIvLlwe3w4MbyGL86AzfN8QOxDoHzZyDWzifQCGu38'
const OUTLOOK_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCOoDJb-Gu-AhqNLY36278hhufp_Czt0pIEZxbDeK5yruw8IbvqQ353IlSbyqqH95Kt65tlBVZ3XhWT_76BsQdCRPPHOw1gzc9TIFHy-JUX8cxE0N9BdG9-yDUE2ZN-7yTHvbOPmuqzChkAHlVYzg3PQ4FCkBSYkAzBknKq0tj7IlIVGVmPOSJx-xnwwYs49ZnvWL_kAwtAfwo2dO8XT2nhHP7pq5KHmSzmRr1eti2OQhNLnBlgSEW_gVnufIRLj10p1G8bc3d815DO'
const GOOGLE_CARD_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCSB4RsDiP_vE1er46-wbmbG567QG2aweqb7VEt1hSZqnW0MLMq2JOrOkhIhEouKsWabnxAgtl-QFnoQ2J7HX7R5DOVw40fcGrkaN-6RegJwo7qTQoWdCPZagpareEuJLayMn5oCrDZwCFZQvWL2l2VBYvQdufE4qIiWJ8MYRM0lzvFnsMuT6lso9RSOD3Mk6k0MOxStI8ERaGjdXr4A6v_RQYNNJU34wziTDUWHSWssrnFIEULZSxiryAvXrZPE_43Rne34yMK9UZA'

function formatLastSynced(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never synced'
  const d = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Last synced just now'
  if (diffMins < 60) return `Last synced ${diffMins}m ago`
  if (diffHours < 24) return `Last synced ${diffHours}h ago`
  if (diffDays < 7) return `Last synced ${diffDays}d ago`
  return `Last synced ${d.toLocaleDateString()}`
}

type SettingsSection = 'general' | 'calendars' | 'notifications' | 'availability' | 'accessibility'

interface CalendarSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  /** When provided, "Connect Google" / "Connect Outlook" will call this (e.g. to open ConnectCalendarModal). */
  onConnectCalendar?: () => void
}

export default function CalendarSettingsPanel({
  isOpen,
  onClose,
  onConnectCalendar,
}: CalendarSettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')
  const [settings, setSettings] = useState<any>(null)
  const [calendars, setCalendars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchSettings()
      fetchCalendars()
    }
  }, [isOpen])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/calendar/settings', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCalendars = async () => {
    try {
      const response = await fetch('/api/calendar/settings/calendars', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
      }
    } catch (error) {
      console.error('Error fetching calendars:', error)
    }
  }

  const updateSettings = async (updates: any) => {
    setSaving(true)
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calendarSettingsUpdated', { detail: data.settings }))
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }
    } catch (error: any) {
      console.error('Error updating settings:', error)
      alert(error.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectGoogle = () => {
    if (onConnectCalendar) {
      onClose()
      onConnectCalendar()
    }
  }

  const handleConnectOutlook = () => {
    if (onConnectCalendar) {
      onClose()
      onConnectCalendar()
    }
  }

  if (!isOpen) return null

  const navItems: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'calendars', label: 'Calendar Connections', icon: 'calendar_today' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'availability', label: 'Availability', icon: 'schedule' },
    { id: 'accessibility', label: 'Accessibility', icon: 'accessibility' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-settings-title"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h1 id="calendar-settings-title" className="text-xl font-bold text-slate-900 dark:text-white">
            Calendar Settings
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <aside className="w-64 border-r border-slate-200 dark:border-slate-800 p-4 space-y-1 overflow-y-auto shrink-0 hidden md:block">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg mr-3">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 p-8 overflow-y-auto min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="max-w-2xl">
                {activeSection === 'general' && (
                  <GeneralSettings settings={settings} onUpdate={updateSettings} saving={saving} />
                )}
                {activeSection === 'calendars' && (
                  <CalendarConnectionsSection
                    calendars={calendars}
                    onRefresh={fetchCalendars}
                    onConnectGoogle={handleConnectGoogle}
                    onConnectOutlook={handleConnectOutlook}
                  />
                )}
                {activeSection === 'notifications' && (
                  <NotificationSettings settings={settings} onUpdate={updateSettings} saving={saving} />
                )}
                {activeSection === 'availability' && (
                  <AvailabilitySection settings={settings} onUpdate={updateSettings} saving={saving} />
                )}
                {activeSection === 'accessibility' && (
                  <AccessibilitySection settings={settings} onUpdate={updateSettings} saving={saving} />
                )}
              </div>
            )}
          </main>
        </div>

        <footer className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-medium bg-primary text-white hover:bg-blue-600 transition-colors shadow-sm shadow-primary/30"
          >
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  )
}

const TIMEZONE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
]

const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '15 mins', value: 15 },
  { label: '30 mins', value: 30 },
  { label: '45 mins', value: 45 },
  { label: '60 mins', value: 60 },
  { label: '90 mins', value: 90 },
  { label: '120 mins', value: 120 },
]

const VIEW_OPTIONS: { label: string; value: string }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
]

function GeneralSettings({ settings, onUpdate, saving }: { settings: any; onUpdate: (u: any) => Promise<void>; saving: boolean }) {
  const [formData, setFormData] = useState({
    defaultTimezone: settings?.default_timezone || 'America/New_York',
    defaultEventDurationMinutes: settings?.default_event_duration_minutes || 30,
    defaultView: settings?.default_view || 'week',
    showWeekends: settings?.show_weekends ?? true,
    viewDensity: settings?.view_density || 'compact',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultTimezone: settings.default_timezone || 'America/New_York',
        defaultEventDurationMinutes: settings.default_event_duration_minutes || 30,
        defaultView: settings.default_view || 'week',
        showWeekends: settings.show_weekends ?? true,
        viewDensity: settings.view_density || 'compact',
      })
    }
  }, [settings])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    onUpdate({ [field]: value })
  }

  const selectClass =
    'mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm'

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-8 text-slate-800 dark:text-slate-100">General Settings</h2>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <label id="general-timezone-label" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Timezone
          </label>
          <select
            id="general-timezone"
            aria-labelledby="general-timezone-label"
            value={formData.defaultTimezone}
            onChange={(e) => handleChange('defaultTimezone', e.target.value)}
            className={selectClass}
          >
            {TIMEZONE_OPTIONS.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label id="general-duration-label" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default Event Duration
            </label>
            <select
              id="general-duration"
              aria-labelledby="general-duration-label"
              value={formData.defaultEventDurationMinutes}
              onChange={(e) => handleChange('defaultEventDurationMinutes', parseInt(e.target.value))}
              className={selectClass}
            >
              {DURATION_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label id="general-view-label" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default View
            </label>
            <select
              id="general-view"
              aria-labelledby="general-view-label"
              value={formData.defaultView}
              onChange={(e) => handleChange('defaultView', e.target.value)}
              className={selectClass}
            >
              {VIEW_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 mt-6 pt-6">
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Show Weekends</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Display Saturday and Sunday in calendar views</p>
          </div>
          <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <input
              type="checkbox"
              checked={formData.showWeekends}
              onChange={(e) => handleChange('showWeekends', e.target.checked)}
              className="sr-only peer"
              aria-label="Show weekends"
            />
            <span className="block h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-primary transition-colors duration-200" aria-hidden />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5" aria-hidden />
          </label>
        </div>

        <div className="space-y-2 py-2 border-t border-slate-100 dark:border-slate-800 pt-6">
          <label id="general-density-label" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            View Density
          </label>
          <div className="flex space-x-4" role="radiogroup" aria-labelledby="general-density-label">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="density"
                checked={formData.viewDensity === 'compact'}
                onChange={() => handleChange('viewDensity', 'compact')}
                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                aria-label="Compact"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Compact</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="density"
                checked={formData.viewDensity === 'comfortable'}
                onChange={() => handleChange('viewDensity', 'comfortable')}
                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                aria-label="Comfortable"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Comfortable</span>
            </label>
          </div>
        </div>
      </form>
    </div>
  )
}

function CalendarConnectionsSection({
  calendars,
  onRefresh,
  onConnectGoogle,
  onConnectOutlook,
}: {
  calendars: any[]
  onRefresh: () => Promise<void>
  onConnectGoogle: () => void
  onConnectOutlook: () => void
}) {
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const handleSyncOne = async () => {
    setSyncingId('all')
    try {
      const res = await fetch('/api/calendar/sync/manual', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) await onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSyncingId(null)
    }
  }

  const handleDisconnect = async (connectionId: string, name: string) => {
    if (!confirm(`Disconnect "${name}"? This will stop syncing events from this calendar.`)) return
    setDisconnecting(connectionId)
    try {
      const res = await fetch(`/api/calendar/connections/${connectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        await onRefresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to disconnect')
      }
    } catch (e: any) {
      alert(e.message || 'Failed to disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  const isGoogle = (provider: string) =>
    /google/i.test(provider)
  const isOutlook = (provider: string) =>
    /microsoft|outlook|365|exchange/i.test(provider)

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Connect New Calendar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <button
          type="button"
          onClick={onConnectGoogle}
          className="flex items-center justify-center p-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
        >
          <img alt="Google Calendar" className="w-6 h-6 mr-3" src={GOOGLE_CALENDAR_LOGO} />
          <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
            Connect Google
          </span>
        </button>
        <button
          type="button"
          onClick={onConnectOutlook}
          className="flex items-center justify-center p-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
        >
          <img alt="Outlook Calendar" className="w-6 h-6 mr-3" src={OUTLOOK_LOGO} />
          <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
            Connect Outlook
          </span>
        </button>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Connected Calendars</h2>
      <div className="space-y-4">
        {calendars.length === 0 ? (
          <div className="p-6 text-center border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">No calendars connected yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Connect Google or Outlook above to sync events</p>
          </div>
        ) : (
          calendars.map((item: any) => {
            const conn = item.connection || {}
            const name = item.settings?.name || conn.calendar_name || conn.email || 'Calendar'
            const email = conn.email || ''
            const provider = (conn.provider || '').toLowerCase()
            const logo = isGoogle(provider) ? GOOGLE_CARD_LOGO : isOutlook(provider) ? OUTLOOK_LOGO : GOOGLE_CARD_LOGO
            const lastSync = formatLastSynced(conn.last_sync_at)

            return (
              <div
                key={conn.id}
                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center min-w-0">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center mr-4 shrink-0">
                    <img alt="" className="w-5 h-5" src={logo} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {email || name}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="relative flex h-2.5 w-2.5 mr-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Active - {lastSync}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSyncOne()}
                    disabled={!!syncingId}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {syncingId ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(conn.id, name)}
                    disabled={disconnecting === conn.id}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={`Remove ${email || name}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function NotificationSettings({
  settings,
  onUpdate,
  saving,
}: {
  settings: any
  onUpdate: (u: any) => Promise<void>
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    notificationsEmail: settings?.notifications_email ?? true,
    notificationsInApp: settings?.notifications_in_app ?? true,
    notificationsSms: settings?.notifications_sms ?? false,
    notificationSoundEnabled: settings?.notification_sound_enabled ?? true,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        notificationsEmail: settings.notifications_email ?? true,
        notificationsInApp: settings.notifications_in_app ?? true,
        notificationsSms: settings.notifications_sms ?? false,
        notificationSoundEnabled: settings.notification_sound_enabled ?? true,
      })
    }
  }, [settings])

  const handleToggle = (field: string) => {
    const newValue = !formData[field as keyof typeof formData]
    setFormData((prev) => ({ ...prev, [field]: newValue }))
    onUpdate({ [field]: newValue })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Notifications</h2>
      <div className="space-y-4">
        {[
          { key: 'notificationsEmail', label: 'Email notifications', desc: 'Receive event notifications via email' },
          { key: 'notificationsInApp', label: 'In-app notifications', desc: 'Show notifications in the application' },
          { key: 'notificationsSms', label: 'SMS notifications', desc: 'Receive notifications via text message' },
          { key: 'notificationSoundEnabled', label: 'Notification sound', desc: 'Play sound when notifications arrive' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</label>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" aria-label={item.label}>
              <input
                type="checkbox"
                checked={formData[item.key as keyof typeof formData] as boolean}
                onChange={() => handleToggle(item.key)}
                className="sr-only peer"
                aria-label={item.label}
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function AvailabilitySection({
  settings,
  onUpdate,
  saving,
}: {
  settings: any
  onUpdate: (u: any) => Promise<void>
  saving: boolean
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Availability</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Set your working hours and availability. This section can be expanded later.
      </p>
    </div>
  )
}

function AccessibilitySection({
  settings,
  onUpdate,
  saving,
}: {
  settings: any
  onUpdate: (u: any) => Promise<void>
  saving: boolean
}) {
  const { theme, setTheme } = useTheme()
  const [formData, setFormData] = useState({
    colorCodeByEventType: settings?.color_code_by_event_type ?? true,
    showDeclinedEvents: settings?.show_declined_events ?? false,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        colorCodeByEventType: settings.color_code_by_event_type ?? true,
        showDeclinedEvents: settings.show_declined_events ?? false,
      })
    }
  }, [settings])

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setTheme(value)
    onUpdate({ appearance: value })
  }

  const handleToggle = (field: string) => {
    const newValue = !formData[field as keyof typeof formData]
    setFormData((prev) => ({ ...prev, [field]: newValue }))
    onUpdate({ [field]: newValue })
  }

  const THEME_OPTIONS: { id: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { id: 'light', label: 'Light', icon: 'light_mode' },
    { id: 'dark', label: 'Dark', icon: 'dark_mode' },
    { id: 'system', label: 'System default', icon: 'settings_brightness' },
  ]

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6 text-slate-900 dark:text-white">Accessibility Settings</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Theme</h3>
          <div className="grid grid-cols-3 gap-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {THEME_OPTIONS.map((opt) => {
              const isActive = theme === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleThemeChange(opt.id)}
                  className={`flex flex-col items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                  aria-pressed={isActive ? 'true' : 'false'}
                >
                  <span className={`material-symbols-outlined text-xl mb-1 ${isActive ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>
                    {opt.icon}
                  </span>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-800 my-6" />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Color code by event type</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Use different colors for different event types</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.colorCodeByEventType}
              onChange={() => handleToggle('colorCodeByEventType')}
              className="sr-only peer"
              aria-label="Color code by event type"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary" />
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">Show declined events</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Display events you've declined in calendar views</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.showDeclinedEvents}
              onChange={() => handleToggle('showDeclinedEvents')}
              className="sr-only peer"
              aria-label="Show declined events"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary" />
          </label>
        </div>
      </div>
    </div>
  )
}
