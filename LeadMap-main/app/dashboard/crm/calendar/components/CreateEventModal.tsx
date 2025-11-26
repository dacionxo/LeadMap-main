'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, Tag, FileText, Users } from 'lucide-react'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  initialEndDate?: Date
  relatedType?: string
  relatedId?: string
  defaultEventType?: string
  onSuccess?: () => void
  eventId?: string
}

// Simple timezone helper
const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

// Convert UTC ISO string to datetime-local format in user's timezone
// Used for displaying times when editing events
const utcToLocalInput = (utcIso: string, timezone: string): string => {
  if (!utcIso) return ''
  const date = new Date(utcIso)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find(p => p.type === 'year')?.value || ''
  const month = parts.find(p => p.type === 'month')?.value || ''
  const day = parts.find(p => p.type === 'day')?.value || ''
  const hour = parts.find(p => p.type === 'hour')?.value || '00'
  const minute = parts.find(p => p.type === 'minute')?.value || '00'
  return `${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

export default function CreateEventModal({
  isOpen,
  onClose,
  initialDate,
  initialEndDate,
  relatedType,
  relatedId,
  defaultEventType,
  onSuccess,
  eventId,
}: CreateEventModalProps) {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: defaultEventType || 'call',
    startTime: '',
    endTime: '',
    allDay: false,
    location: '',
    conferencingLink: '',
    notes: '',
    reminderMinutes: [] as number[],
  })
  const isEditMode = !!eventId

  useEffect(() => {
    if (isOpen) {
      fetchSettings()
      if (isEditMode && eventId) {
        // Will fetch after settings load
      }
    } else {
      // Reset form when modal closes
      setFormData({
        title: '',
        description: '',
        eventType: defaultEventType || 'call',
        startTime: '',
        endTime: '',
        allDay: false,
        location: '',
        conferencingLink: '',
        notes: '',
        reminderMinutes: [],
      })
    }
  }, [isOpen, isEditMode, eventId, defaultEventType])

  useEffect(() => {
    if (isOpen && isEditMode && eventId && settings) {
      fetchEventData()
    }
  }, [isOpen, isEditMode, eventId, settings])

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const event = data.event
        const userTimezone = settings?.default_timezone || getBrowserTimezone()
        
        let startTime = ''
        let endTime = ''
        
        if (event.all_day && event.start_date && event.end_date) {
          // All-day: use dates with midnight times
          startTime = `${event.start_date}T00:00`
          endTime = `${event.end_date}T23:59`
        } else if (event.start_time && event.end_time) {
          // Timed: convert UTC to local
          startTime = utcToLocalInput(event.start_time, userTimezone)
          endTime = utcToLocalInput(event.end_time, userTimezone)
        }
        
        setFormData({
          title: event.title || '',
          description: event.description || '',
          eventType: event.event_type || 'call',
          startTime,
          endTime,
          allDay: event.all_day || false,
          location: event.location || '',
          conferencingLink: event.conferencing_link || '',
          notes: event.notes || '',
          reminderMinutes: event.reminder_minutes || [],
        })
      }
    } catch (error) {
      console.error('Error fetching event data:', error)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/calendar/settings', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        if (data.settings?.default_reminders) {
          const reminders = data.settings.default_reminders.map((r: any) => r.minutes)
          setFormData((prev) => ({
            ...prev,
            reminderMinutes: reminders,
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  // Helper to format Date objects in user's timezone
  const formatDateToLocalInput = (date: Date, tz: string): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const year = parts.find(p => p.type === 'year')?.value || ''
    const month = parts.find(p => p.type === 'month')?.value || ''
    const day = parts.find(p => p.type === 'day')?.value || ''
    const hour = parts.find(p => p.type === 'hour')?.value || '00'
    const minute = parts.find(p => p.type === 'minute')?.value || '00'
    return `${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
  }

  useEffect(() => {
    if (initialDate && settings) {
      const defaultDuration = settings?.default_event_duration_minutes || 30
      const endDate = initialEndDate || new Date(initialDate.getTime() + defaultDuration * 60 * 1000)
      const userTimezone = settings?.default_timezone || getBrowserTimezone()
      
      // Format Date objects directly in user's timezone (don't convert to UTC first)
      // The Date object from FullCalendar is already timezone-aware
      setFormData((prev) => ({
        ...prev,
        startTime: formatDateToLocalInput(initialDate, userTimezone),
        endTime: formatDateToLocalInput(endDate, userTimezone),
      }))
    } else if (!initialDate && settings && isOpen && !isEditMode) {
      // When opening modal without initialDate, set current time in user's timezone
      const userTimezone = settings?.default_timezone || getBrowserTimezone()
      const now = new Date()
      const defaultDuration = settings?.default_event_duration_minutes || 30
      const endTime = new Date(now.getTime() + defaultDuration * 60 * 1000)
      
      setFormData((prev) => ({
        ...prev,
        startTime: formatDateToLocalInput(now, userTimezone),
        endTime: formatDateToLocalInput(endTime, userTimezone),
      }))
    }
  }, [initialDate, initialEndDate, settings, isOpen, isEditMode])

  const eventTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'visit', label: 'Property Visit' },
    { value: 'showing', label: 'Property Showing' },
    { value: 'content', label: 'Content Post' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'other', label: 'Other' },
  ]

  const reminderOptions = [
    { value: 5, label: '5 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userTimezone = settings?.default_timezone || getBrowserTimezone()
      const url = isEditMode ? `/api/calendar/events/${eventId}` : '/api/calendar/events'
      const method = isEditMode ? 'PUT' : 'POST'
      
      let startTime: string | null = null
      let endTime: string | null = null
      let startDate: string | null = null
      let endDate: string | null = null
      
      if (formData.allDay) {
        // All-day events: extract dates only (no timezone conversion)
        startDate = formData.startTime.split('T')[0]
        endDate = formData.endTime.split('T')[0]
      } else {
        // Timed events: Send times in user's timezone
        // The backend will convert to UTC before saving
        // Format: "YYYY-MM-DDTHH:MM" in user's timezone
        // We'll send this along with the timezone, and backend converts to UTC
        startTime = formData.startTime // Keep as datetime-local format
        endTime = formData.endTime // Keep as datetime-local format
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          eventType: formData.eventType,
          startTime, // datetime-local format in user's timezone
          endTime, // datetime-local format in user's timezone
          startDate,
          endDate,
          timezone: userTimezone, // User's timezone - backend will use this to convert to UTC
          eventTimezone: userTimezone,
          allDay: formData.allDay,
          location: formData.location,
          conferencingLink: formData.conferencingLink || null,
          relatedType: relatedType || null,
          relatedId: relatedId || null,
          notes: formData.notes,
          reminderMinutes: formData.reminderMinutes.length > 0 ? formData.reminderMinutes : (settings?.default_reminders?.map((r: any) => r.minutes) || [15]),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || (isEditMode ? 'Failed to update event' : 'Failed to create event'))
      }

      if (onSuccess) onSuccess()
      onClose()
      
      setFormData({
        title: '',
        description: '',
        eventType: defaultEventType || 'call',
        startTime: '',
        endTime: '',
        allDay: false,
        location: '',
        conferencingLink: '',
        notes: '',
        reminderMinutes: [],
      })
    } catch (error: any) {
      alert(error.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const toggleReminder = (minutes: number) => {
    setFormData((prev) => ({
      ...prev,
      reminderMinutes: prev.reminderMinutes.includes(minutes)
        ? prev.reminderMinutes.filter((m) => m !== minutes)
        : [...prev.reminderMinutes, minutes],
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{isEditMode ? 'Edit Event' : 'Create Event'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Type *
            </label>
            <select
              required
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {eventTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="allDay" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              All day event
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Event description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reminders
            </label>
            <div className="space-y-2">
              {reminderOptions.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.reminderMinutes.includes(option.value)}
                    onChange={() => toggleReminder(option.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Event' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
