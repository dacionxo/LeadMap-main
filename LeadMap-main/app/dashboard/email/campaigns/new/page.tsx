'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../../components/DashboardLayout'
import { 
  Mail, 
  Loader2,
  AlertCircle,
  Plus,
  X
} from 'lucide-react'

interface Mailbox {
  id: string
  email: string
  display_name?: string
  active: boolean
}

interface Step {
  stepNumber: number
  delayHours: number
  subject: string
  html: string
  stopOnReply: boolean
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  
  const [formData, setFormData] = useState({
    mailboxId: '',
    name: '',
    description: '',
    sendStrategy: 'single' as 'single' | 'sequence',
    startAt: '',
    timezone: 'UTC'
  })

  const [steps, setSteps] = useState<Step[]>([
    { stepNumber: 1, delayHours: 0, subject: '', html: '', stopOnReply: true }
  ])

  const [recipients, setRecipients] = useState<Array<{ email: string; firstName?: string; lastName?: string }>>([])

  useEffect(() => {
    fetchMailboxes()
  }, [])

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes')
      if (!response.ok) throw new Error('Failed to fetch mailboxes')
      const data = await response.json()
      const activeMailboxes = (data.mailboxes || []).filter((m: Mailbox) => m.active)
      setMailboxes(activeMailboxes)
      if (activeMailboxes.length > 0) {
        setFormData(prev => ({ ...prev, mailboxId: activeMailboxes[0].id }))
      }
    } catch (err) {
      console.error('Error loading mailboxes:', err)
    }
  }

  const handleAddStep = () => {
    setSteps([...steps, {
      stepNumber: steps.length + 1,
      delayHours: 48,
      subject: '',
      html: '',
      stopOnReply: true
    }])
  }

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({
        ...s,
        stepNumber: i + 1
      })))
    }
  }

  const handleStepChange = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const handleAddRecipient = () => {
    setRecipients([...recipients, { email: '' }])
  }

  const handleRecipientChange = (index: number, field: string, value: string) => {
    const newRecipients = [...recipients]
    newRecipients[index] = { ...newRecipients[index], [field]: value }
    setRecipients(newRecipients)
  }

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!formData.mailboxId || !formData.name) {
      alert('Please fill in required fields')
      return
    }

    if (steps.some(s => !s.subject || !s.html)) {
      alert('Please fill in all step subject and content')
      return
    }

    if (recipients.length === 0) {
      alert('Please add at least one recipient')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxId: formData.mailboxId,
          name: formData.name,
          description: formData.description,
          sendStrategy: formData.sendStrategy,
          startAt: formData.startAt || null,
          timezone: formData.timezone,
          steps: steps.map(s => ({
            delayHours: s.delayHours,
            subject: s.subject,
            html: s.html,
            stopOnReply: s.stopOnReply
          })),
          recipients: recipients
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign')
      }

      router.push(`/dashboard/email/campaigns/${data.campaign.id}`)
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Campaign</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Create a new email campaign or sequence
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Basics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basics</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mailbox <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.mailboxId}
                  onChange={(e) => setFormData(prev => ({ ...prev, mailboxId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select a mailbox</option>
                  {mailboxes.map(mailbox => (
                    <option key={mailbox.id} value={mailbox.id}>
                      {mailbox.display_name || mailbox.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Send Strategy
                  </label>
                  <select
                    value={formData.sendStrategy}
                    onChange={(e) => setFormData(prev => ({ ...prev, sendStrategy: e.target.value as 'single' | 'sequence' }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="single">Single Email</option>
                    <option value="sequence">Sequence</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date/Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Steps</h2>
              {formData.sendStrategy === 'sequence' && (
                <button
                  onClick={handleAddStep}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              )}
            </div>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">Step {step.stepNumber}</h3>
                    {steps.length > 1 && (
                      <button
                        onClick={() => handleRemoveStep(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {index > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Delay (hours)
                        </label>
                        <input
                          type="number"
                          value={step.delayHours}
                          onChange={(e) => handleStepChange(index, 'delayHours', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          min="0"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={step.subject}
                        onChange={(e) => handleStepChange(index, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        HTML Content <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={step.html}
                        onChange={(e) => handleStepChange(index, 'html', e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recipients</h2>
              <button
                onClick={handleAddRecipient}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Add Recipient
              </button>
            </div>
            <div className="space-y-2">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="email"
                    value={recipient.email}
                    onChange={(e) => handleRecipientChange(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleRemoveRecipient(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

