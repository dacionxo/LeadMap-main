'use client'

import { RefreshCw } from 'lucide-react'
import moment from 'moment'
import { useCallback, useEffect, useMemo, useState } from 'react'

moment.locale('en')

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: {
    eventType?: string
    location?: string
    description?: string
    relatedType?: string
    relatedId?: string
    status?: string
    backgroundColor?: string
    borderColor?: string
  }
}

interface CalendarViewProps {
  onEventClick?: (event: {
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
    }
  }) => void
  onDateSelect?: (start: Date, end: Date) => void
  calendarType?: string | null
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKS_IN_VIEW = 5
const DAYS_IN_VIEW = WEEKS_IN_VIEW * 7
const MAX_EVENTS_PER_DAY = 2
const TIME_GRID_START_HOUR = 8
const TIME_GRID_END_HOUR = 18
const MINUTES_PER_HOUR = 60

export default function CalendarView({ onEventClick, onDateSelect }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<any>(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [view, setView] = useState<CalendarViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      setSettings(event.detail)
    }

    window.addEventListener('calendarSettingsUpdated', handleSettingsUpdate as EventListener)
    return () => {
      window.removeEventListener('calendarSettingsUpdated', handleSettingsUpdate as EventListener)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
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
      setSettingsLoaded(true)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  /**
   * Calendar is intentionally constrained to 5 week rows (35 days) to keep the
   * page compact and avoid inner scrolling.
   *
   * For months that span 6 weeks, we choose either the first 5 or last 5 weeks
   * based on which window contains the current week (keeps navigation intuitive).
   */
  const monthGridStart = useMemo(() => {
    const monthStart = moment(currentDate).startOf('month')
    const firstWeekStart = monthStart.clone().startOf('week')
    const monthEnd = moment(currentDate).endOf('month')
    const lastWeekStart = monthEnd.clone().endOf('week').startOf('week')
    const totalWeeks = lastWeekStart.diff(firstWeekStart, 'weeks') + 1

    if (totalWeeks <= WEEKS_IN_VIEW) return firstWeekStart

    // totalWeeks is typically 6 here: show a 5-week window that contains currentDate's week
    const currentWeekStart = moment(currentDate).startOf('week')
    const weekIndex = currentWeekStart.diff(firstWeekStart, 'weeks')
    return weekIndex <= 2 ? firstWeekStart : firstWeekStart.clone().add(1, 'week')
  }, [currentDate])

  const monthGridEnd = useMemo(() => monthGridStart.clone().add(DAYS_IN_VIEW - 1, 'days'), [monthGridStart])

  const activeRange = useMemo(() => {
    if (view === 'week') {
      const start = moment(currentDate).startOf('week')
      const end = start.clone().add(6, 'days').endOf('day')
      return { start, end }
    }
    if (view === 'day') {
      const start = moment(currentDate).startOf('day')
      const end = moment(currentDate).endOf('day')
      return { start, end }
    }
    if (view === 'agenda') {
      const start = moment(currentDate).startOf('week')
      const end = start.clone().add(6, 'days').endOf('day')
      return { start, end }
    }
    return { start: monthGridStart.clone().startOf('day'), end: monthGridEnd.clone().endOf('day') }
  }, [currentDate, monthGridEnd, monthGridStart, view])

  const getEventColor = (eventType?: string): string => {
    const colors: Record<string, string> = {
      call: '#3b82f6',
      visit: '#10b981',
      showing: '#f59e0b',
      content: '#8b5cf6',
      meeting: '#ec4899',
      follow_up: '#6366f1',
      other: '#6b7280',
      email_campaign: '#3b82f6',
    }
    return colors[eventType || 'other'] || colors.other
  }

  const formatEventForCalendar = useCallback(
    (event: any): CalendarEvent => {
      let eventColor: string
      if (settings?.color_code_by_event_type !== false) {
        eventColor = getEventColor(event.event_type)
      } else {
        eventColor = event.color || settings?.default_calendar_color || '#3b82f6'
      }

      if (event.all_day && event.start_date && event.end_date) {
        const startDate = new Date(event.start_date)
        const endDate = new Date(event.end_date)
        endDate.setDate(endDate.getDate() + 1)

        return {
          id: event.id,
          title: event.title,
          start: startDate,
          end: endDate,
          allDay: true,
          resource: {
            eventType: event.event_type,
            location: event.location,
            description: event.description,
            relatedType: event.related_type,
            relatedId: event.related_id,
            status: event.status,
            backgroundColor: eventColor,
            borderColor: eventColor,
          },
        }
      }

      const startDate = new Date(event.start_time || event.start_date)
      const endDate = new Date(event.end_time || event.end_date || event.start_time || event.start_date)

      return {
        id: event.id,
        title: event.title,
        start: startDate,
        end: endDate,
        allDay: false,
        resource: {
          eventType: event.event_type,
          location: event.location,
          description: event.description,
          relatedType: event.related_type,
          relatedId: event.related_id,
          status: event.status,
          backgroundColor: eventColor,
          borderColor: eventColor,
        },
      }
    },
    [settings?.color_code_by_event_type, settings?.default_calendar_color]
  )

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const start = activeRange.start.toISOString()
      const end = activeRange.end.toISOString()

      const response = await fetch(`/api/calendar/events?start=${start}&end=${end}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      let calendarEvents = data.events || []

      if (settings?.show_declined_events === false) {
        calendarEvents = calendarEvents.filter((event: any) => event.status !== 'cancelled')
      }

      const formattedCalendarEvents: CalendarEvent[] = calendarEvents.map((event: any) =>
        formatEventForCalendar(event)
      )

      let emailEvents: CalendarEvent[] = []
      try {
        const emailResponse = await fetch(`/api/campaigns?startDate=${start}&endDate=${end}`, {
          credentials: 'include',
        })
        if (emailResponse.ok) {
          const emailData = await emailResponse.json()
          emailEvents = (emailData.campaigns || [])
            .filter((campaign: any) => campaign.start_at && campaign.status !== 'cancelled' && campaign.status !== 'completed')
            .map((campaign: any) => {
              const startDate = new Date(campaign.start_at)
              const endDate = new Date(startDate.getTime() + 30 * 60 * 1000)
              return {
                id: `email-${campaign.id}`,
                title: campaign.name,
                start: startDate,
                end: endDate,
                allDay: false,
                resource: {
                  eventType: 'email_campaign',
                  relatedType: 'campaign',
                  relatedId: campaign.id,
                  description: `Email campaign: ${campaign.name}`,
                  status: campaign.status,
                  backgroundColor: '#3b82f6',
                  borderColor: '#2563eb',
                },
              } as CalendarEvent
            })
        }
      } catch (emailError) {
        console.error('Error fetching email campaigns:', emailError)
      }

      setEvents([...formattedCalendarEvents, ...emailEvents])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }, [activeRange.end, activeRange.start, formatEventForCalendar, settings?.show_declined_events])

  useEffect(() => {
    if (!settingsLoaded) return
    fetchEvents()
  }, [fetchEvents, settingsLoaded])

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchEvents()
    }
    window.addEventListener('calendarSyncComplete', handleSyncComplete)
    return () => window.removeEventListener('calendarSyncComplete', handleSyncComplete)
  }, [fetchEvents])

  const monthDays = useMemo(() => {
    if (view !== 'month') return []
    return Array.from({ length: DAYS_IN_VIEW }).map((_, idx) => monthGridStart.clone().add(idx, 'day').toDate())
  }, [monthGridStart, view])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    if (view !== 'month') return map
    monthDays.forEach((day) => {
      const dayKey = moment(day).format('YYYY-MM-DD')
      const dayEvents = events.filter((event) => {
        const start = moment(event.start).startOf('day')
        const end = moment(event.end).startOf('day')
        const target = moment(day).startOf('day')
        return target.isBetween(start, end, 'day', '[]')
      })
      map.set(dayKey, dayEvents)
    })
    return map
  }, [events, monthDays])

  const handleGoToToday = () => setCurrentDate(new Date())

  const handleNavigateDate = (direction: 'prev' | 'next') => {
    const unit: moment.unitOfTime.DurationConstructor =
      view === 'week' || view === 'agenda' ? 'week' : view === 'day' ? 'day' : 'month'
    const next = moment(currentDate).add(direction === 'next' ? 1 : -1, unit).toDate()
    setCurrentDate(next)
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (!onEventClick) return
    onEventClick({
      id: event.id,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      allDay: event.allDay,
      backgroundColor: event.resource?.backgroundColor,
      borderColor: event.resource?.borderColor,
      extendedProps: {
        eventType: event.resource?.eventType,
        location: event.resource?.location,
        description: event.resource?.description,
        relatedType: event.resource?.relatedType,
        relatedId: event.resource?.relatedId,
        status: event.resource?.status,
      },
    })
  }

  const handleDayClick = (day: Date) => {
    if (!onDateSelect) return
    const start = new Date(day)
    start.setHours(9, 0, 0, 0)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    onDateSelect(start, end)
  }

  const getEventChipClasses = (event: CalendarEvent) => {
    const eventType = event.resource?.eventType || 'other'
    if (eventType === 'meeting' || eventType === 'content') {
      return 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-50'
    }
    if (eventType === 'showing' || eventType === 'deadline') {
      return 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-50'
    }
    if (eventType === 'email_campaign' || eventType === 'call' || eventType === 'follow_up') {
      return 'bg-blue-500 text-white hover:bg-blue-600'
    }
    return 'bg-white border border-gray-100 text-gray-700 hover:border-blue-200'
  }

  const weekDays = useMemo(() => {
    if (view !== 'week' && view !== 'agenda') return []
    const start = moment(currentDate).startOf('week')
    return Array.from({ length: 7 }).map((_, idx) => start.clone().add(idx, 'day').toDate())
  }, [currentDate, view])

  const dayForDayView = useMemo(() => {
    if (view !== 'day') return null
    return moment(currentDate).toDate()
  }, [currentDate, view])

  const timeLabels = useMemo(() => {
    return Array.from({ length: TIME_GRID_END_HOUR - TIME_GRID_START_HOUR + 1 }).map((_, idx) => {
      const hour = TIME_GRID_START_HOUR + idx
      const label = moment().hour(hour).minute(0).format('h A')
      return { hour, label }
    })
  }, [])

  if (!settingsLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-500">Loading calendar...</span>
        </div>
      </div>
    )
  }

  const getWeekDayHeaderTone = (day: Date) => {
    const isToday = moment(day).isSame(new Date(), 'day')
    if (isToday) return 'today' as const
    if (moment(day).isBefore(new Date(), 'day')) return 'past' as const
    return 'future' as const
  }

  const getEventCardClasses = (eventType?: string) => {
    const type = eventType || 'other'
    if (type === 'meeting' || type === 'content') {
      return {
        container: 'bg-purple-50 border-purple-500 hover:bg-purple-100',
        title: 'text-purple-700',
        meta: 'text-purple-500',
        avatarBg: 'bg-purple-200',
        avatarText: 'text-purple-700',
      }
    }
    if (type === 'visit') {
      return {
        container: 'bg-emerald-50 border-emerald-500 hover:bg-emerald-100',
        title: 'text-emerald-800',
        meta: 'text-emerald-600',
        avatarBg: 'bg-emerald-200',
        avatarText: 'text-emerald-700',
      }
    }
    if (type === 'showing' || type === 'deadline') {
      return {
        container: 'bg-amber-50 border-amber-500 hover:bg-amber-100',
        title: 'text-amber-700',
        meta: 'text-amber-500',
        avatarBg: 'bg-amber-200',
        avatarText: 'text-amber-700',
      }
    }
    if (type === 'email_campaign' || type === 'call' || type === 'follow_up') {
      return {
        container: 'bg-blue-100 border-blue-500 hover:bg-blue-200',
        title: 'text-blue-800',
        meta: 'text-blue-600',
        avatarBg: 'bg-blue-200',
        avatarText: 'text-blue-800',
      }
    }
    if (type === 'other') {
      return {
        container: 'bg-gray-50 border-gray-400 hover:bg-gray-100',
        title: 'text-gray-700',
        meta: 'text-gray-500',
        avatarBg: 'bg-gray-200',
        avatarText: 'text-gray-700',
      }
    }
    return {
      container: 'bg-indigo-50 border-indigo-500 hover:bg-indigo-100',
      title: 'text-indigo-700',
      meta: 'text-indigo-500',
      avatarBg: 'bg-indigo-200',
      avatarText: 'text-indigo-700',
    }
  }

  const getInitialsFromTitle = (title: string) => {
    const parts = title.trim().split(/\s+/g).filter(Boolean)
    if (parts.length === 0) return 'EV'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }

  const getMinutesFromGridStart = (date: Date) => {
    const startMinutes = TIME_GRID_START_HOUR * MINUTES_PER_HOUR
    const currentMinutes = date.getHours() * MINUTES_PER_HOUR + date.getMinutes()
    return currentMinutes - startMinutes
  }

  const clampToGrid = (minutes: number) => {
    const maxMinutes = (TIME_GRID_END_HOUR - TIME_GRID_START_HOUR + 1) * MINUTES_PER_HOUR
    return Math.max(0, Math.min(maxMinutes, minutes))
  }

  const handleOpenCalendarSettings = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('openCalendarSettings'))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative text-text-main">
      <header className="shrink-0 z-20 px-8 py-6 border-b border-gray-200/80 dark:border-slate-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-gray-200 shadow-sm">
            <button
              type="button"
              onClick={handleGoToToday}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-full transition-colors"
            >
              Today
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              type="button"
              onClick={() => handleNavigateDate('prev')}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors"
            >
              Back
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              type="button"
              onClick={() => handleNavigateDate('next')}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors"
            >
              Next
            </button>
          </div>

          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">
            {moment(currentDate).format('MMMM YYYY')}
          </h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white p-1 rounded-full border border-gray-200 shadow-sm">
              {(['month', 'week', 'day', 'agenda'] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    view === mode
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-label={`Switch to ${mode} view`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleOpenCalendarSettings}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Calendar settings"
            >
              <span className="material-symbols-outlined text-xl">settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-auto custom-scrollbar relative bg-white">
        {view === 'week' && (
          <>
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50/80 sticky top-0 z-30 backdrop-blur-sm">
              <div className="py-3 border-r border-gray-100" />
              {weekDays.map((day, idx) => {
                const tone = getWeekDayHeaderTone(day)
                const isToday = tone === 'today'
                const isPast = tone === 'past'
                return (
                  <div
                    key={moment(day).format('YYYY-MM-DD')}
                    className={`py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50/50' : ''}`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                        isToday ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {WEEKDAY_LABELS[idx]}
                    </div>
                    {isToday ? (
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold mx-auto shadow-sm">
                        {moment(day).format('DD')}
                      </div>
                    ) : (
                      <div className={`text-xl font-medium ${isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                        {moment(day).format('DD')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="week-grid-container flex-1 relative">
              <div className="time-column bg-white z-10 sticky left-0">
                <div className="h-[30px]" />
                {timeLabels.map((slot) => (
                  <div key={slot.hour} className="time-slot">
                    {slot.label}
                  </div>
                ))}
              </div>

              {weekDays.map((day) => {
                const dayKey = moment(day).format('YYYY-MM-DD')
                const isToday = moment(day).isSame(new Date(), 'day')
                const dayEvents = events
                  .filter((event) => moment(event.start).isSame(day, 'day') || moment(day).isBetween(event.start, event.end, 'day', '[]'))
                  .filter((event) => !event.allDay)

                return (
                  <div
                    key={dayKey}
                    className={`day-column ${isToday ? 'bg-blue-50/20 relative' : 'bg-white'}`}
                  >
                    {timeLabels.map((_, idx) => (
                      <div key={idx} className="grid-line" />
                    ))}

                    {/* Click-capture overlay (prevents nested interactive controls) */}
                    <button
                      type="button"
                      className="absolute inset-0 z-[5] cursor-pointer bg-transparent"
                      aria-label={`Create an event on ${moment(day).format('dddd, MMMM D')}`}
                      onClick={(e) => {
                        if (!onDateSelect) return
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                        const y = e.clientY - rect.top
                        const minutesFromGridStart = clampToGrid(Math.round(y))
                        const start = new Date(day)
                        start.setHours(TIME_GRID_START_HOUR, 0, 0, 0)
                        start.setMinutes(start.getMinutes() + minutesFromGridStart)
                        const end = new Date(start.getTime() + 30 * 60 * 1000)
                        onDateSelect(start, end)
                      }}
                      onKeyDown={(e) => {
                        if (!onDateSelect) return
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        e.preventDefault()
                        const start = new Date(day)
                        start.setHours(9, 0, 0, 0)
                        const end = new Date(start.getTime() + 30 * 60 * 1000)
                        onDateSelect(start, end)
                      }}
                    />

                    {dayEvents.map((event) => {
                      const startMinutes = clampToGrid(getMinutesFromGridStart(event.start))
                      const endMinutes = clampToGrid(getMinutesFromGridStart(event.end))
                      const top = Math.min(startMinutes, endMinutes)
                      const height = Math.max(30, Math.abs(endMinutes - startMinutes))
                      const styles = getEventCardClasses(event.resource?.eventType)
                      const timeLabel = `${moment(event.start).format('h:mm')} - ${moment(event.end).format('h:mm A')}`
                      const initials = getInitialsFromTitle(event.title)

                      return (
                        <div
                          key={event.id}
                          className="absolute left-1 right-2 z-10"
                          style={{ top, height }}
                        >
                          <button
                            type="button"
                            className={`h-full w-full border-l-4 rounded-r-lg p-2 cursor-pointer transition-colors shadow-sm ${styles.container}`}
                            onClick={(eventClick) => {
                              eventClick.stopPropagation()
                              handleEventClick(event)
                            }}
                            aria-label={`Open event ${event.title}`}
                          >
                            <div className="flex justify-between items-start h-full">
                              <div className="overflow-hidden">
                                <p className={`text-xs font-semibold truncate ${styles.title}`}>{event.title}</p>
                                <p className={`text-[10px] ${styles.meta}`}>{timeLabel}</p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-white ml-1 shrink-0 ${styles.avatarBg} ${styles.avatarText}`}
                                aria-hidden
                              >
                                {initials}
                              </div>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {view === 'month' && (
          <>
            <div className="shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {label}
                </div>
              ))}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-5 bg-white divide-x divide-gray-100">
              {monthDays.map((day) => {
                const dayKey = moment(day).format('YYYY-MM-DD')
                const isCurrentMonth = moment(day).month() === moment(currentDate).month()
                const isToday = moment(day).isSame(new Date(), 'day')
                const dayEvents = eventsByDay.get(dayKey) || []

                return (
                  <div
                    key={dayKey}
                    className={`p-2 border-b border-gray-100 relative transition-colors cursor-pointer overflow-hidden ${
                      isToday ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'group hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Click-capture overlay (prevents nested interactive controls) */}
                    <button
                      type="button"
                      className="absolute inset-0 z-[5] cursor-pointer bg-transparent"
                      aria-label={`Create an event on ${moment(day).format('dddd, MMMM D')}`}
                      onClick={() => handleDayClick(day)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return
                        e.preventDefault()
                        handleDayClick(day)
                      }}
                    />

                    {isToday ? (
                      <span className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
                        {moment(day).format('DD')}
                      </span>
                    ) : (
                      <span
                        className={`absolute top-3 right-3 text-sm font-medium ${
                          isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                        }`}
                      >
                        {moment(day).format('DD')}
                      </span>
                    )}

                    {dayEvents.length > 0 && (
                      <div className={`${isToday ? 'mt-8' : 'mt-7'} w-full space-y-1 overflow-hidden relative z-10`}>
                        {dayEvents.slice(0, MAX_EVENTS_PER_DAY).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={(eventClick) => {
                              eventClick.stopPropagation()
                              handleEventClick(event)
                            }}
                            className={`${getEventChipClasses(event)} rounded-lg px-2.5 py-1.5 shadow-sm text-[11px] font-medium cursor-pointer transition-colors flex flex-col gap-0.5 w-full text-left`}
                            aria-label={`Open event ${event.title}`}
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  event.resource?.eventType === 'email_campaign' || event.resource?.eventType === 'call'
                                    ? 'bg-white'
                                    : event.resource?.eventType === 'meeting'
                                      ? 'bg-purple-500'
                                      : event.resource?.eventType === 'showing'
                                        ? 'bg-amber-500'
                                        : 'bg-blue-500'
                                }`}
                                aria-hidden
                              />
                              <span className="truncate">{event.title}</span>
                            </div>
                            <span
                              className={`text-[10px] ${
                                event.resource?.eventType === 'email_campaign' ? 'opacity-90' : 'opacity-75'
                              }`}
                            >
                              {event.allDay
                                ? 'All day'
                                : `${moment(event.start).format('h:mm A')} - ${moment(event.end).format('h:mm A')}`}
                            </span>
                          </button>
                        ))}

                        {dayEvents.length > MAX_EVENTS_PER_DAY && (
                          <div className="text-[10px] font-medium text-gray-400 px-1">
                            +{dayEvents.length - MAX_EVENTS_PER_DAY} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {view === 'day' && dayForDayView && (
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-[60px_1fr] border-b border-gray-200 bg-gray-50/80 sticky top-0 z-30 backdrop-blur-sm">
              <div className="py-3 border-r border-gray-100" />
              <div className="py-3 text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                  {moment(dayForDayView).format('ddd')}
                </div>
                <div className="text-xl font-medium text-gray-700">{moment(dayForDayView).format('DD')}</div>
              </div>
            </div>

            <div className="week-grid-container week-grid-container--day flex-1 relative">
              <div className="time-column bg-white z-10 sticky left-0">
                <div className="h-[30px]" />
                {timeLabels.map((slot) => (
                  <div key={slot.hour} className="time-slot">
                    {slot.label}
                  </div>
                ))}
              </div>

              <div
                className="day-column bg-blue-50/20 relative"
              >
                {timeLabels.map((_, idx) => (
                  <div key={idx} className="grid-line" />
                ))}

                {/* Click-capture overlay (prevents nested interactive controls) */}
                <button
                  type="button"
                  className="absolute inset-0 z-[5] cursor-pointer bg-transparent"
                  aria-label={`Create an event on ${moment(dayForDayView).format('dddd, MMMM D')}`}
                  onClick={(e) => {
                    if (!onDateSelect) return
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                    const y = e.clientY - rect.top
                    const minutesFromGridStart = clampToGrid(Math.round(y))
                    const start = new Date(dayForDayView)
                    start.setHours(TIME_GRID_START_HOUR, 0, 0, 0)
                    start.setMinutes(start.getMinutes() + minutesFromGridStart)
                    const end = new Date(start.getTime() + 30 * 60 * 1000)
                    onDateSelect(start, end)
                  }}
                  onKeyDown={(e) => {
                    if (!onDateSelect) return
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    const start = new Date(dayForDayView)
                    start.setHours(9, 0, 0, 0)
                    const end = new Date(start.getTime() + 30 * 60 * 1000)
                    onDateSelect(start, end)
                  }}
                />

                {events
                  .filter((event) => moment(event.start).isSame(dayForDayView, 'day'))
                  .filter((event) => !event.allDay)
                  .map((event) => {
                    const startMinutes = clampToGrid(getMinutesFromGridStart(event.start))
                    const endMinutes = clampToGrid(getMinutesFromGridStart(event.end))
                    const top = Math.min(startMinutes, endMinutes)
                    const height = Math.max(30, Math.abs(endMinutes - startMinutes))
                    const styles = getEventCardClasses(event.resource?.eventType)
                    const timeLabel = `${moment(event.start).format('h:mm')} - ${moment(event.end).format('h:mm A')}`
                    const initials = getInitialsFromTitle(event.title)

                    return (
                      <div key={event.id} className="absolute left-1 right-2 z-10" style={{ top, height }}>
                        <button
                          type="button"
                          className={`h-full w-full border-l-4 rounded-r-lg p-2 cursor-pointer transition-colors shadow-sm ${styles.container}`}
                          onClick={(eventClick) => {
                            eventClick.stopPropagation()
                            handleEventClick(event)
                          }}
                          aria-label={`Open event ${event.title}`}
                        >
                          <div className="flex justify-between items-start h-full">
                            <div className="overflow-hidden">
                              <p className={`text-xs font-semibold truncate ${styles.title}`}>{event.title}</p>
                              <p className={`text-[10px] ${styles.meta}`}>{timeLabel}</p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-white ml-1 shrink-0 ${styles.avatarBg} ${styles.avatarText}`}
                              aria-hidden
                            >
                              {initials}
                            </div>
                          </div>
                        </button>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {view === 'agenda' && (
          <div className="flex-1 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">
                {moment(activeRange.start).format('MMM D')} - {moment(activeRange.end).format('MMM D, YYYY')}
              </h2>
              <span className="text-xs text-gray-400">{events.length} events</span>
            </div>
            <div className="space-y-2">
              {events
                .slice()
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((event) => {
                  const styles = getEventCardClasses(event.resource?.eventType)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={`w-full text-left border-l-4 rounded-r-lg p-3 shadow-sm transition-colors ${styles.container}`}
                      onClick={() => handleEventClick(event)}
                      aria-label={`Open event ${event.title}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${styles.title}`}>{event.title}</p>
                          <p className={`text-xs mt-0.5 ${styles.meta}`}>
                            {event.allDay
                              ? moment(event.start).format('ddd, MMM D') + ' (All day)'
                              : `${moment(event.start).format('ddd, MMM D • h:mm A')} – ${moment(event.end).format('h:mm A')}`}
                          </p>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white shrink-0 ${styles.avatarBg} ${styles.avatarText}`}
                          aria-hidden
                        >
                          {getInitialsFromTitle(event.title)}
                        </div>
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
