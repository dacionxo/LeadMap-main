'use client'

import { useState, useEffect } from 'react'

interface Attendee {
  email?: string
  name?: string
  status?: string
  organizer?: boolean
}

interface EventModalEvent {
  id: string
  title: string
  start: string
  end: string
  allDay?: boolean
  backgroundColor?: string
  borderColor?: string
  extendedProps?: {
    eventType?: string
    location?: string
    description?: string
    relatedType?: string
    relatedId?: string
    status?: string
    conferencingLink?: string
  }
}

interface FullEvent {
  id: string
  title: string
  start_time: string | null
  end_time: string | null
  start_date: string | null
  end_date: string | null
  all_day: boolean
  location: string | null
  description: string | null
  conferencing_link: string | null
  event_type?: string
  attendees?: Attendee[] | string
  reminder_minutes?: number[] | null
  organizer_email?: string | null
  organizer_name?: string | null
}

interface EventModalProps {
  event: EventModalEvent | null
  onClose: () => void
  onEdit?: (eventId: string) => void
  onDelete?: (eventId: string) => void
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

function getStatusBadge(status?: string): { label: string; className: string; icon: string } {
  const s = (status || 'needsAction').toLowerCase()
  if (s === 'accepted') return { label: 'Accepted', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: 'check_circle' }
  if (s === 'declined') return { label: 'Declined', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: 'cancel' }
  return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: 'schedule' }
}

export default function EventModal({ event, onClose, onEdit, onDelete }: EventModalProps) {
  const [userTimezone, setUserTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [fullEvent, setFullEvent] = useState<FullEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/calendar/settings', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const tz = data.settings?.default_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
          setUserTimezone(tz)
        }
      } catch {
        setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    if (!event?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/calendar/events/${event.id}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.event) setFullEvent(data.event)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [event?.id])

  if (!event) return null

  const location = event.extendedProps?.location || fullEvent?.location || null
  const description = event.extendedProps?.description || fullEvent?.description || null
  const conferencingLink = event.extendedProps?.conferencingLink || fullEvent?.conferencing_link || null

  let attendees: Attendee[] = []
  if (fullEvent?.attendees) {
    if (typeof fullEvent.attendees === 'string') {
      try {
        attendees = JSON.parse(fullEvent.attendees) as Attendee[]
      } catch {
        attendees = []
      }
    } else if (Array.isArray(fullEvent.attendees)) {
      attendees = fullEvent.attendees
    }
  }

  const reminderMinutes = fullEvent?.reminder_minutes
  const reminderLabel =
    reminderMinutes && reminderMinutes.length > 0
      ? `Remind me ${Math.min(...reminderMinutes)} minutes before`
      : 'No reminder set'

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return d.toLocaleDateString('en-US', {
      timeZone: userTimezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTimeRange = () => {
    if (event.allDay) {
      const start = event.start ? formatDate(event.start) : ''
      const end = event.end ? formatDate(event.end) : ''
      return start && end && start !== end ? `${start} - ${end}` : start || 'All day'
    }
    const s = new Date(event.start)
    const e = new Date(event.end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return ''
    const tzLabel = userTimezone.replace(/_/g, ' ')
    return `${s.toLocaleTimeString('en-US', { timeZone: userTimezone, hour: 'numeric', minute: '2-digit' })} - ${e.toLocaleTimeString('en-US', { timeZone: userTimezone, hour: 'numeric', minute: '2-digit' })} (${tzLabel})`
  }

  const dateTimeLabel = event.allDay
    ? formatTimeRange()
    : `${formatDate(event.start)} · ${formatTimeRange()}`

  const handleJoinMeeting = () => {
    if (conferencingLink) window.open(conferencingLink, '_blank')
  }

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this event?')) {
      onDelete(event.id)
      onClose()
    }
  }

  const handleReschedule = () => {
    if (onEdit) {
      onEdit(event.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-50 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <h2 id="event-modal-title" className="text-2xl font-semibold text-gray-900 dark:text-white truncate">
              {event.title || 'Event'}
            </h2>
            {onEdit && (
              <button
                type="button"
                onClick={handleReschedule}
                className="text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors shrink-0"
                aria-label="Edit event"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-colors shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl block">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 flex-1 overflow-y-auto space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date & Time */}
                <div className="flex items-start gap-4">
                  <div className="bg-blue-500/10 text-blue-500 p-3 rounded-2xl flex-shrink-0">
                    <span className="material-symbols-outlined block">calendar_today</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Date & Time</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {event.start ? formatDate(event.start) : '—'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatTimeRange() || '—'}
                    </p>
                  </div>
                </div>

                {/* Location / Meeting */}
                <div className="flex items-start gap-4">
                  <div className="bg-blue-500/10 text-blue-500 p-3 rounded-2xl flex-shrink-0">
                    <span className="material-symbols-outlined block">videocam</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Location</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {location || (conferencingLink ? 'Online Meeting' : '—')}
                    </p>
                    {conferencingLink && (
                      <a
                        href={conferencingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline mt-0.5 inline-block break-all"
                      >
                        {conferencingLink}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Participants */}
              {attendees.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                    Participants ({attendees.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {attendees.map((a, i) => {
                      const name = a.name || a.email || 'Unknown'
                      const badge = getStatusBadge(a.status)
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-semibold shrink-0">
                              {getInitials(name, a.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {a.organizer ? 'Organizer' : (a.email || '')}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 shrink-0 ${badge.className}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                            {badge.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Agenda / Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                  Agenda
                </h3>
                <div className="prose dark:prose-invert max-w-none text-sm text-gray-900 dark:text-gray-100 leading-relaxed bg-gray-50/30 dark:bg-gray-800/30 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
                  {description ? (
                    <div className="whitespace-pre-wrap">{description}</div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">No agenda added.</p>
                  )}
                </div>
              </div>

              {/* Reminders */}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="material-symbols-outlined text-lg">notifications_active</span>
                <span>{reminderLabel}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
          {onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium text-sm flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <span className="material-symbols-outlined text-[18px]">delete_outline</span>
              Delete Event
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                type="button"
                onClick={handleReschedule}
                className="px-6 py-2.5 rounded-full font-medium text-sm border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Reschedule
              </button>
            )}
            {conferencingLink ? (
              <button
                type="button"
                onClick={handleJoinMeeting}
                className="px-6 py-2.5 rounded-full font-medium text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
              >
                <span className="material-symbols-outlined text-[18px]">videocam</span>
                Join Meeting
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full font-medium text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
