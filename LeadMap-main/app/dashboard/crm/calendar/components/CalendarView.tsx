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
      const start = moment(currentDate).startOf('month').startOf('week').toISOString()
      const end = moment(currentDate).endOf('month').endOf('week').toISOString()

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
  }, [currentDate, formatEventForCalendar, settings?.show_declined_events])

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
    const monthStart = moment(currentDate).startOf('month')
    const gridStart = monthStart.clone().startOf('week')
    return Array.from({ length: 42 }).map((_, idx) => gridStart.clone().add(idx, 'day').toDate())
  }, [currentDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
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
    const next = moment(currentDate).add(direction === 'next' ? 1 : -1, 'month').toDate()
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative text-text-main">
      <header className="shrink-0 z-20 px-8 py-6 border-b border-gray-100">
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
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto custom-scrollbar relative bg-white">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr h-full bg-white divide-x divide-gray-100">
          {monthDays.map((day) => {
            const dayKey = moment(day).format('YYYY-MM-DD')
            const isCurrentMonth = moment(day).month() === moment(currentDate).month()
            const isToday = moment(day).isSame(new Date(), 'day')
            const dayEvents = eventsByDay.get(dayKey) || []

            return (
              <div
                key={dayKey}
                className={`min-h-[140px] p-2 border-b border-gray-100 relative transition-colors cursor-pointer ${
                  isToday ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'group hover:bg-gray-50/50'
                }`}
                onClick={() => handleDayClick(day)}
              >
                {isToday ? (
                  <span className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold shadow-sm">
                    {moment(day).format('DD')}
                  </span>
                ) : (
                  <span className={`absolute top-3 right-3 text-sm font-medium ${isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                    {moment(day).format('DD')}
                  </span>
                )}

                {dayEvents.length > 0 && (
                  <div className={`${isToday ? 'mt-8' : 'mt-7'} w-full space-y-1`}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(eventClick) => {
                          eventClick.stopPropagation()
                          handleEventClick(event)
                        }}
                        className={`${getEventChipClasses(event)} rounded-lg px-2.5 py-1.5 shadow-sm text-xs font-medium cursor-pointer transition-colors flex flex-col gap-0.5 w-full text-left`}
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
                          />
                          <span className="truncate">{event.title}</span>
                        </div>
                        <span className={`text-[10px] ${event.resource?.eventType === 'email_campaign' ? 'opacity-90' : 'opacity-75'}`}>
                          {event.allDay ? 'All day' : `${moment(event.start).format('h:mm A')} - ${moment(event.end).format('h:mm A')}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <div className="absolute bottom-10 right-10 z-50">
        <button
          type="button"
          className="flex items-center gap-3 pl-1.5 pr-5 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="material-symbols-outlined text-lg animate-pulse">auto_awesome</span>
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold leading-none">Ask AI</span>
            <span className="block text-[10px] text-blue-100 leading-none mt-0.5">Ready to help</span>
          </div>
          <div className="ml-2 w-5 h-5 rounded bg-white/20 flex items-center justify-center text-[10px] font-bold">⌘K</div>
        </button>
      </div>
    </div>
  )
}
