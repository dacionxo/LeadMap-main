'use client'

import { useCallback, useState } from 'react'
import { Icon } from '@iconify/react'

const MIN_LENGTH = 8
const HAS_NUMBER = /\d/
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/
const HAS_UPPERCASE = /[A-Z]/

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

function getPasswordStrength(password: string): { strength: PasswordStrength; count: number } {
  if (!password) return { strength: 'weak', count: 0 }
  let count = 0
  if (password.length >= MIN_LENGTH) count++
  if (HAS_NUMBER.test(password)) count++
  if (HAS_SPECIAL.test(password)) count++
  if (HAS_UPPERCASE.test(password)) count++
  const strength: PasswordStrength =
    count <= 1 ? 'weak' : count === 2 ? 'fair' : count === 3 ? 'good' : 'strong'
  return { strength, count }
}

function getStrengthLabel(strength: PasswordStrength): string {
  return strength.charAt(0).toUpperCase() + strength.slice(1)
}

function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'text-red-500'
    case 'fair':
      return 'text-amber-500'
    case 'good':
      return 'text-emerald-500'
    case 'strong':
      return 'text-emerald-500'
    default:
      return 'text-slate-500'
  }
}

function getSegmentBg(count: number, index: number): string {
  if (index >= count) return 'bg-slate-200 dark:bg-slate-600'
  if (count <= 1) return 'bg-red-500'
  if (count === 2) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export interface SecurityFormState {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface SecuritySettingsProps {
  formState: SecurityFormState
  onFormStateChange: (state: SecurityFormState) => void
  saving: boolean
  onSubmit: () => Promise<void>
  onCancel: () => void
  formId: string
}

export default function SecuritySettings({
  formState,
  onFormStateChange,
  saving,
  onSubmit,
  onCancel,
  formId,
}: SecuritySettingsProps) {
  const [showNewPassword, setShowNewPassword] = useState(false)
  const { newPassword, confirmPassword, currentPassword } = formState

  const { strength, count } = getPasswordStrength(newPassword)
  const strengthLabel = getStrengthLabel(strength)
  const strengthColor = getStrengthColor(strength)

  const hasMinLength = newPassword.length >= MIN_LENGTH
  const hasNumber = HAS_NUMBER.test(newPassword)
  const hasSpecial = HAS_SPECIAL.test(newPassword)
  const hasUppercase = HAS_UPPERCASE.test(newPassword)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await onSubmit()
    },
    [onSubmit]
  )

  const update = useCallback(
    (updates: Partial<SecurityFormState>) => {
      onFormStateChange({ ...formState, ...updates })
    },
    [formState, onFormStateChange]
  )

  return (
    <div className="max-w-3xl" data-settings="security-section">
      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6" data-settings="security-heading">
        Change Password
      </h2>
      <form id={formId} className="space-y-8" onSubmit={handleSubmit} data-settings="security-form">
        <div className="grid grid-cols-1 gap-y-6">
          <div className="space-y-2" data-settings="security-field-current">
            <label
              className="block text-sm font-semibold text-slate-700 dark:text-gray-300 ml-1"
              htmlFor="currentPassword"
            >
              Current Password
            </label>
            <div className="relative rounded-md shadow-sm group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Icon
                  icon="material-symbols:key"
                  className="text-slate-400 dark:text-gray-500 text-[20px] group-focus-within:text-[#3B82F6] transition-colors"
                  aria-hidden
                />
              </div>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => update({ currentPassword: e.target.value })}
                data-settings="input-glass"
                className="settings-input-glass block w-full rounded-xl border border-gray-200 dark:border-gray-700 pl-11 pr-10 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 text-slate-700 dark:text-gray-200 placeholder-slate-400 font-medium tracking-wide"
                autoComplete="current-password"
                aria-label="Current password"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-2" data-settings="security-divider" />

          <div className="space-y-2" data-settings="security-field-new">
            <label
              className="block text-sm font-semibold text-slate-700 dark:text-gray-300 ml-1"
              htmlFor="newPassword"
            >
              New Password
            </label>
            <div className="relative rounded-md shadow-sm group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Icon
                  icon="material-symbols:lock-reset"
                  className="text-slate-400 dark:text-gray-500 text-[20px] group-focus-within:text-[#3B82F6] transition-colors"
                  aria-hidden
                />
              </div>
              <input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => update({ newPassword: e.target.value })}
                data-settings="input-glass"
                className="settings-input-glass block w-full rounded-xl border border-gray-200 dark:border-gray-700 pl-11 pr-10 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 text-slate-700 dark:text-gray-200 placeholder-slate-400 font-medium tracking-wide"
                autoComplete="new-password"
                aria-label="New password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                <Icon
                  icon={showNewPassword ? 'material-symbols:visibility' : 'material-symbols:visibility-off'}
                  className="text-[20px]"
                  aria-hidden
                />
              </button>
            </div>

            <div className="mt-4 px-1" data-settings="security-strength">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">Password Strength</span>
                <span className={`text-xs font-bold ${strengthColor}`}>{strengthLabel}</span>
              </div>
              <div className="flex gap-2 h-2 w-full" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={4} aria-label="Password strength">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-full rounded-full flex-1 ${getSegmentBg(count, i)}`}
                    data-settings="security-strength-segment"
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 px-1" data-settings="security-requirements">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                <Icon
                  icon={hasMinLength ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'}
                  className={hasMinLength ? 'text-[18px] text-emerald-500' : 'text-[18px] text-slate-400'}
                  aria-hidden
                />
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                <Icon
                  icon={hasNumber ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'}
                  className={hasNumber ? 'text-[18px] text-emerald-500' : 'text-[18px] text-slate-400'}
                  aria-hidden
                />
                <span>Contains a number</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                <Icon
                  icon={hasSpecial ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'}
                  className={hasSpecial ? 'text-[18px] text-emerald-500' : 'text-[18px] text-slate-400'}
                  aria-hidden
                />
                <span>Contains a special character</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500">
                <Icon
                  icon={hasUppercase ? 'material-symbols:check-circle' : 'material-symbols:radio-button-unchecked'}
                  className={hasUppercase ? 'text-[18px] text-emerald-500' : 'text-[18px] text-slate-400'}
                  aria-hidden
                />
                <span>Contains uppercase letter</span>
              </div>
            </div>
          </div>

          <div className="space-y-2" data-settings="security-field-confirm">
            <label
              className="block text-sm font-semibold text-slate-700 dark:text-gray-300 ml-1"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <div className="relative rounded-md shadow-sm group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Icon
                  icon="material-symbols:check-circle"
                  className="text-slate-400 dark:text-gray-500 text-[20px] group-focus-within:text-[#3B82F6] transition-colors"
                  aria-hidden
                />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => update({ confirmPassword: e.target.value })}
                data-settings="input-glass"
                className="settings-input-glass block w-full rounded-xl border border-gray-200 dark:border-gray-700 pl-11 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 sm:text-sm py-3 text-slate-700 dark:text-gray-200 placeholder-slate-400 font-medium tracking-wide"
                autoComplete="new-password"
                aria-label="Confirm new password"
              />
            </div>
          </div>
        </div>
      </form>
      <div className="h-24" aria-hidden />
    </div>
  )
}

export { getPasswordStrength, getStrengthLabel }
