'use client'

import { useState, useEffect } from 'react'

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
          description: event.description || event.notes || '',
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
    { value: 5, label: '5 mins before' },
    { value: 15, label: '15 mins before' },
    { value: 30, label: '30 mins before' },
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? 'Edit Event' : 'Create Event'}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-modal flex overflow-hidden relative animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-64 bg-gray-50 border-r border-gray-100 flex-shrink-0 hidden md:flex flex-col">
          <div className="p-6 pb-4 border-b border-gray-100/50">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-blue-500">history</span>
              Recent Activity
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="relative pl-4 border-l-2 border-gray-200 space-y-6">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                <p className="text-xs text-gray-500 mb-1">Just now</p>
                <p className="text-xs font-medium text-gray-800">
                  Event <span className="text-blue-600">{isEditMode ? 'Updated' : 'Created'}</span>
                </p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 bg-gray-300 rounded-full border-2 border-white" />
                <p className="text-xs text-gray-500 mb-1">2 hours ago</p>
                <p className="text-xs font-medium text-gray-800">
                  Note added by <span className="text-gray-600">Tyquan</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-col px-8 pt-6 pb-2 shrink-0 bg-white z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isEditMode ? 'Edit Event' : 'Create Event'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-blue-200">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Details</span>
                </div>
                <div className="flex-1 h-0.5 bg-blue-600 mx-2 -mt-4" />
                <div className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-600 text-blue-600 flex items-center justify-center text-xs font-bold shadow-sm">
                    2
                  </div>
                  <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">Schedule</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-200 mx-2 -mt-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-600 w-1/4" />
                </div>
                <div className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center text-xs font-bold shadow-sm">
                    3
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reminders</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-200 mx-2 -mt-4" />
                <div className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Done</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 modal-scroll">
            <form id="calendar-create-event-form" onSubmit={handleSubmit} className="space-y-6 pb-2">
              <div>
                <label
                  htmlFor="calendar-event-title"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <span className="material-symbols-outlined text-lg text-gray-400">title</span>
                  Title
                </label>
                <input
                  id="calendar-event-title"
                  className="w-full px-4 py-3 rounded-2xl border-gray-200 text-gray-800 input-focus-glow focus:ring-0 bg-white text-sm shadow-sm transition-all placeholder:text-gray-400 font-medium"
                  placeholder="Event title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="calendar-event-type"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                  >
                    <span className="material-symbols-outlined text-lg text-gray-400">category</span>
                    Event Type
                  </label>
                  <div className="relative">
                    <select
                      id="calendar-event-type"
                      className="w-full px-4 py-3 rounded-2xl border-gray-200 text-gray-800 input-focus-glow focus:ring-0 bg-white text-sm shadow-sm transition-all appearance-none font-medium"
                      required
                      value={formData.eventType}
                      onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    >
                      {eventTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                      <span className="material-symbols-outlined text-xl">expand_more</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="calendar-event-location"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                  >
                    <span className="material-symbols-outlined text-lg text-gray-400">location_on</span>
                    Location
                  </label>
                  <div className="relative">
                    <input
                      id="calendar-event-location"
                      className="w-full px-4 py-3 rounded-2xl border-gray-200 text-gray-800 input-focus-glow focus:ring-0 bg-white text-sm shadow-sm transition-all placeholder:text-gray-400 font-medium"
                      placeholder="Event location"
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="calendar-event-start-time"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                  >
                    <span className="material-symbols-outlined text-lg text-gray-400">calendar_today</span>
                    Start Time
                  </label>
                  <div className="relative">
                    <input
                      id="calendar-event-start-time"
                      className="w-full px-4 py-3 rounded-2xl border-gray-200 text-gray-800 input-focus-glow focus:ring-0 bg-white text-sm shadow-sm transition-all placeholder:text-gray-400 font-medium"
                      type="datetime-local"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="calendar-event-end-time"
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                  >
                    <span className="material-symbols-outlined text-lg text-gray-400">schedule</span>
                    End Time
                  </label>
                  <div className="relative">
                    <input
                      id="calendar-event-end-time"
                      className="w-full px-4 py-3 rounded-2xl border-gray-200 text-gray-800 input-focus-glow focus:ring-0 bg-white text-sm shadow-sm transition-all placeholder:text-gray-400 font-medium"
                      type="datetime-local"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  id="allDay"
                  type="checkbox"
                  checked={formData.allDay}
                  onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700 select-none" htmlFor="allDay">
                  All day event
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <span className="material-symbols-outlined text-lg text-gray-400">notifications</span>
                  Reminders
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {reminderOptions.map((option) => {
                    const isChecked = formData.reminderMinutes.includes(option.value)
                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/50 border-blue-200' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleReminder(option.value)}
                        />
                        <span className={`text-sm ${isChecked ? 'text-gray-800 font-medium' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="calendar-event-description"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <span className="material-symbols-outlined text-lg text-gray-400">notes</span>
                  Description / Notes
                </label>
                <textarea
                  id="calendar-event-description"
                  className="w-full px-4 py-3 rounded-2xl border-gray-200 text-gray-800 input-focus-glow focus:ring-0 bg-white text-sm shadow-sm transition-all resize-none placeholder:text-gray-400 font-medium"
                  placeholder="Event description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value, notes: e.target.value })}
                />
              </div>
            </form>
          </div>

          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 px-6 py-2.5 rounded-full font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="calendar-create-event-form"
              disabled={loading || !formData.title.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Event' : 'Create Event'}
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
