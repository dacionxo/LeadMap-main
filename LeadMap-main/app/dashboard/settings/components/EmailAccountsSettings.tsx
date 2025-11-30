'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Mail, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface Mailbox {
  id: string
  provider: 'gmail' | 'outlook' | 'smtp'
  email: string
  display_name: string
  active: boolean
  daily_limit: number
  hourly_limit: number
}

function EmailAccountsSettingsContent() {
  const searchParams = useSearchParams()
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)

  useEffect(() => {
    // Check for OAuth success/error messages
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success) {
      if (success === 'gmail_connected') {
        alert('Gmail mailbox connected successfully!')
      } else if (success === 'outlook_connected') {
        alert('Outlook mailbox connected successfully!')
      }
      fetchMailboxes()
    }
    if (error) {
      const errorMessages: Record<string, string> = {
        'missing_params': 'OAuth callback missing required parameters',
        'invalid_state': 'Invalid OAuth state. Please try again.',
        'unauthorized': 'Unauthorized. Please log in again.',
        'oauth_not_configured': 'OAuth is not configured. Please contact support.',
        'token_exchange_failed': 'Failed to exchange OAuth token. Please try again.',
        'failed_to_get_email': 'Failed to retrieve email address from provider.',
        'database_error': 'Failed to save mailbox. Please try again.',
        'internal_error': 'An internal error occurred. Please try again.',
      }
      const errorMessage = errorMessages[error] || `Error: ${error}`
      alert(errorMessage)
    }

    fetchMailboxes()
  }, [searchParams])

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setMailboxes(data.mailboxes || [])
        if (data.mailboxes && data.mailboxes.length > 0 && !selectedMailbox) {
          setSelectedMailbox(data.mailboxes[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching mailboxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGmail = async () => {
    try {
      setShowConnectModal(false)
      const response = await fetch('/api/mailboxes/oauth/gmail', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          alert(data.error || 'Failed to get Gmail OAuth URL')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to connect Gmail' }))
        alert(errorData.error || 'Failed to connect Gmail')
      }
    } catch (error) {
      console.error('Error initiating Gmail OAuth:', error)
      alert('Failed to connect Gmail. Please try again.')
    }
  }

  const handleConnectOutlook = async () => {
    try {
      setShowConnectModal(false)
      const response = await fetch('/api/mailboxes/oauth/outlook', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          alert(data.error || 'Failed to get Outlook OAuth URL')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to connect Outlook' }))
        alert(errorData.error || 'Failed to connect Outlook')
      }
    } catch (error) {
      console.error('Error initiating Outlook OAuth:', error)
      alert('Failed to connect Outlook. Please try again.')
    }
  }

  const handleDeleteMailbox = async (mailboxId: string) => {
    if (!confirm('Are you sure you want to disconnect this mailbox?')) return

    try {
      const response = await fetch(`/api/mailboxes/${mailboxId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setMailboxes(mailboxes.filter(m => m.id !== mailboxId))
        if (selectedMailbox === mailboxId) {
          setSelectedMailbox(mailboxes.find(m => m.id !== mailboxId)?.id || null)
        }
      }
    } catch (error) {
      console.error('Error deleting mailbox:', error)
      alert('Failed to disconnect mailbox')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Email Accounts</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your connected email accounts and mailboxes for sending campaigns
        </p>
      </div>

      {/* Mailbox List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Connected Mailboxes:
          </label>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Connect Mailbox
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {mailboxes.map((mailbox) => (
            <div
              key={mailbox.id}
              className={`px-4 py-3 rounded-lg border flex items-center gap-3 transition-colors ${
                selectedMailbox === mailbox.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setSelectedMailbox(mailbox.id)}
            >
              <Mail className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {mailbox.display_name || mailbox.email}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {mailbox.provider.charAt(0).toUpperCase() + mailbox.provider.slice(1)}
                </div>
              </div>
              {mailbox.active ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteMailbox(mailbox.id)
                }}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {mailboxes.length === 0 && (
            <div className="w-full text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                No mailboxes connected. Click "Connect Mailbox" to get started.
              </p>
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Connect Your First Mailbox
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connect Mailbox Modal */}
      {showConnectModal && (
        <ConnectMailboxModal
          onClose={() => setShowConnectModal(false)}
          onConnectGmail={handleConnectGmail}
          onConnectOutlook={handleConnectOutlook}
        />
      )}
    </div>
  )
}

// Connect Mailbox Modal Component
function ConnectMailboxModal({
  onClose,
  onConnectGmail,
  onConnectOutlook,
}: {
  onClose: () => void
  onConnectGmail: () => void
  onConnectOutlook: () => void
}) {
  const [showSMTP, setShowSMTP] = useState(false)
  const [smtpData, setSmtpData] = useState({
    email: '',
    smtp_host: '',
    smtp_port: '',
    smtp_username: '',
    smtp_password: '',
    from_name: '',
  })

  const handleSMTPConnect = async () => {
    // TODO: Implement SMTP connection
    alert('SMTP connection coming soon')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Connect Mailbox</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!showSMTP ? (
            <div className="space-y-3">
              <button
                onClick={onConnectGmail}
                className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3"
              >
                <Mail className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Connect Gmail</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Use your Gmail account</div>
                </div>
              </button>

              <button
                onClick={onConnectOutlook}
                className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3"
              >
                <Mail className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Connect Outlook</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Use your Outlook/Microsoft 365 account</div>
                </div>
              </button>

              <button
                onClick={() => setShowSMTP(true)}
                className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3"
              >
                <Mail className="w-5 h-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Custom SMTP</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Configure SMTP server</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={smtpData.email}
                  onChange={(e) => setSmtpData({ ...smtpData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={smtpData.smtp_host}
                  onChange={(e) => setSmtpData({ ...smtpData, smtp_host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={smtpData.smtp_port}
                  onChange={(e) => setSmtpData({ ...smtpData, smtp_port: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={smtpData.smtp_username}
                  onChange={(e) => setSmtpData({ ...smtpData, smtp_username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={smtpData.smtp_password}
                  onChange={(e) => setSmtpData({ ...smtpData, smtp_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSMTP(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleSMTPConnect}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Connect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmailAccountsSettings() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <EmailAccountsSettingsContent />
    </Suspense>
  )
}

