'use client'

import { useCallback, useState } from 'react'
import { Icon } from '@iconify/react'

export type NotificationFrequency = 'immediate' | 'daily' | 'weekly'

export interface NotificationPreferences {
  channelEmail: boolean
  channelSms: boolean
  channelPush: boolean
  frequency: NotificationFrequency
  marketingNews: boolean
  marketingTips: boolean
  activityComments: boolean
  activityMentions: boolean
  securityLoginAlerts: boolean
}

const INITIAL_PREFS: NotificationPreferences = {
  channelEmail: true,
  channelSms: false,
  channelPush: true,
  frequency: 'immediate',
  marketingNews: true,
  marketingTips: false,
  activityComments: true,
  activityMentions: true,
  securityLoginAlerts: true,
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'data-settings'?: string
  ariaLabel: string
}

function Toggle({ checked, onChange, disabled, 'data-settings': dataSettings, ariaLabel }: ToggleProps) {
  return (
    <label
      className={`relative inline-flex items-center cursor-pointer flex-shrink-0 ${disabled ? 'cursor-not-allowed' : ''}`}
      data-settings={dataSettings}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
        aria-label={ariaLabel}
      />
      <div
        className={`relative w-11 h-6 rounded-full peer-focus:outline-none after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 dark:after:border-gray-600 after:rounded-full after:h-5 after:w-5 after:transition-all
          ${disabled ? 'bg-slate-200/60 cursor-not-allowed peer-checked:bg-[#3B82F6]/50' : 'bg-slate-200 dark:bg-slate-600 peer-checked:bg-[#3B82F6] peer-checked:after:translate-x-full peer-checked:after:border-white'}`}
      />
    </label>
  )
}

interface NotificationsSettingsProps {
  preferences: NotificationPreferences
  onPreferencesChange: (prefs: NotificationPreferences) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

export default function NotificationsSettings({
  preferences,
  onPreferencesChange,
  saving,
  onSave,
  onCancel,
}: NotificationsSettingsProps) {
  const update = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      onPreferencesChange({ ...preferences, ...updates })
    },
    [preferences, onPreferencesChange]
  )

  return (
    <div className="max-w-3xl space-y-10" data-settings="notifications-section">
      {/* Notification Channels */}
      <div data-settings="notifications-channels">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6" data-settings="notifications-channels-heading">
          Notification Channels
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="bg-white/40 dark:bg-gray-800/40 border border-white/50 dark:border-gray-600/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors shadow-sm"
            data-settings="notifications-channel-card"
          >
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-1">
              <Icon icon="material-symbols:mail" className="text-xl" aria-hidden />
            </div>
            <span className="font-semibold text-slate-700 dark:text-gray-200">Email</span>
            <Toggle
              checked={preferences.channelEmail}
              onChange={(v) => update({ channelEmail: v })}
              data-settings="notifications-toggle-email"
              ariaLabel="Toggle email notifications"
            />
          </div>
          <div
            className="bg-white/40 dark:bg-gray-800/40 border border-white/50 dark:border-gray-600/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors shadow-sm"
            data-settings="notifications-channel-card"
          >
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full mb-1">
              <Icon icon="material-symbols:sms" className="text-xl" aria-hidden />
            </div>
            <span className="font-semibold text-slate-700 dark:text-gray-200">SMS</span>
            <Toggle
              checked={preferences.channelSms}
              onChange={(v) => update({ channelSms: v })}
              data-settings="notifications-toggle-sms"
              ariaLabel="Toggle SMS notifications"
            />
          </div>
          <div
            className="bg-white/40 dark:bg-gray-800/40 border border-white/50 dark:border-gray-600/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors shadow-sm"
            data-settings="notifications-channel-card"
          >
            <div className="p-2 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full mb-1">
              <Icon icon="material-symbols:notifications-active" className="text-xl" aria-hidden />
            </div>
            <span className="font-semibold text-slate-700 dark:text-gray-200">Push</span>
            <Toggle
              checked={preferences.channelPush}
              onChange={(v) => update({ channelPush: v })}
              data-settings="notifications-toggle-push"
              ariaLabel="Toggle push notifications"
            />
          </div>
        </div>
      </div>

      {/* Frequency */}
      <div data-settings="notifications-frequency">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4" data-settings="notifications-frequency-heading">
          Frequency
        </h3>
        <div className="bg-slate-100/50 dark:bg-slate-700/30 p-1 rounded-xl inline-flex w-full sm:w-auto flex-wrap" data-settings="notifications-frequency-group">
          <button
            type="button"
            onClick={() => update({ frequency: 'immediate' })}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              preferences.frequency === 'immediate'
                ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold text-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
            data-settings="notifications-freq-immediate"
            aria-pressed={preferences.frequency === 'immediate'}
            aria-label="Immediate notifications"
          >
            Immediate
          </button>
          <button
            type="button"
            onClick={() => update({ frequency: 'daily' })}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              preferences.frequency === 'daily'
                ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold text-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
            data-settings="notifications-freq-daily"
            aria-pressed={preferences.frequency === 'daily'}
            aria-label="Daily digest"
          >
            Daily Digest
          </button>
          <button
            type="button"
            onClick={() => update({ frequency: 'weekly' })}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              preferences.frequency === 'weekly'
                ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold text-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
            data-settings="notifications-freq-weekly"
            aria-pressed={preferences.frequency === 'weekly'}
            aria-label="Weekly digest"
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Marketing */}
      <div className="space-y-6" data-settings="notifications-categories">
        <div className="space-y-4" data-settings="notifications-category-marketing">
          <h4 className="text-sm font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider" data-settings="notifications-category-heading">
            Marketing
          </h4>
          <div
            className="bg-white/40 dark:bg-gray-800/40 border border-white/60 dark:border-gray-600/60 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm"
            data-settings="notifications-category-card"
          >
            <div className="p-5 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-600/50">
              <div className="pr-4 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white">News and Updates</p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Receive news about new features and product updates.</p>
              </div>
              <Toggle
                checked={preferences.marketingNews}
                onChange={(v) => update({ marketingNews: v })}
                data-settings="notifications-toggle-news"
                ariaLabel="Toggle news and updates"
              />
            </div>
            <div className="p-5 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white">Tips and Tutorials</p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Get tips on how to use the platform effectively.</p>
              </div>
              <Toggle
                checked={preferences.marketingTips}
                onChange={(v) => update({ marketingTips: v })}
                data-settings="notifications-toggle-tips"
                ariaLabel="Toggle tips and tutorials"
              />
            </div>
          </div>
        </div>

        {/* Activity Alerts */}
        <div className="space-y-4" data-settings="notifications-category-activity">
          <h4 className="text-sm font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider" data-settings="notifications-category-heading">
            Activity Alerts
          </h4>
          <div
            className="bg-white/40 dark:bg-gray-800/40 border border-white/60 dark:border-gray-600/60 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm"
            data-settings="notifications-category-card"
          >
            <div className="p-5 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-600/50">
              <div className="pr-4 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white">Comments</p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">When someone comments on your tasks or projects.</p>
              </div>
              <Toggle
                checked={preferences.activityComments}
                onChange={(v) => update({ activityComments: v })}
                data-settings="notifications-toggle-comments"
                ariaLabel="Toggle comment notifications"
              />
            </div>
            <div className="p-5 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white">Mentions</p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">When someone mentions you in a thread.</p>
              </div>
              <Toggle
                checked={preferences.activityMentions}
                onChange={(v) => update({ activityMentions: v })}
                data-settings="notifications-toggle-mentions"
                ariaLabel="Toggle mention notifications"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-4" data-settings="notifications-category-security">
          <h4 className="text-sm font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider" data-settings="notifications-category-heading">
            Security
          </h4>
          <div
            className="bg-white/40 dark:bg-gray-800/40 border border-white/60 dark:border-gray-600/60 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm"
            data-settings="notifications-category-card"
          >
            <div className="p-5 flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white">Login Alerts</p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Alerts for new device logins or suspicious activity.</p>
              </div>
              <Toggle
                checked={preferences.securityLoginAlerts}
                onChange={(v) => update({ securityLoginAlerts: v })}
                disabled
                data-settings="notifications-toggle-login-alerts"
                ariaLabel="Login alerts (always on)"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-24" aria-hidden />
    </div>
  )
}

export { INITIAL_PREFS }
