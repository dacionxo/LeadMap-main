/**
 * Calendar Timezone Utilities
 * 
 * World-class calendar time handling:
 * - All times stored in UTC in the database
 * - Convert to/from user's timezone only on display
 * - All-day events use date-only (no timezone conversion)
 * - Recurring events respect timezone for DST-aware expansion
 * 
 * Key principles:
 * 1. Storage: Always UTC (ISO 8601 with Z suffix)
 * 2. Display: Convert UTC → user's timezone
 * 3. Input: Convert user's timezone → UTC before saving
 * 4. All-day: No timezone conversion, just dates
 */

// ============================================================================
// Core Timezone Conversion Functions
// ============================================================================

/**
 * Convert a local datetime string (from datetime-local input) to UTC ISO string
 * The input is interpreted as being in the specified timezone (not browser timezone)
 * 
 * @param dateTimeLocal - String in format "YYYY-MM-DDTHH:MM" 
 * @param timezone - IANA timezone (e.g., "America/New_York")
 * @returns UTC ISO string (e.g., "2023-12-01T17:00:00.000Z")
 */
export function localToUtc(dateTimeLocal: string, timezone: string): string {
  if (!dateTimeLocal) return ''
  
  // Parse the datetime-local input
  const [datePart, timePart] = dateTimeLocal.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number)
  
  // Create a date that represents this exact time in the given timezone
  // Strategy: Start with UTC and adjust until it displays correctly in the target timezone
  let utcEstimate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  
  // Get what time this UTC represents in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  // Iteratively adjust until we get the right time (handles DST correctly)
  for (let i = 0; i < 5; i++) {
    const parts = formatter.formatToParts(utcEstimate)
    const estHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const estMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const estDay = parseInt(parts.find(p => p.type === 'day')?.value || '1')
    
    // Check if we need day adjustment too
    const targetMinutesOfDay = hours * 60 + minutes
    const estMinutesOfDay = estHour * 60 + estMinute
    let diffMinutes = targetMinutesOfDay - estMinutesOfDay
    
    // Handle day boundary crossings
    if (estDay !== day) {
      if (estDay < day) diffMinutes += 24 * 60
      else diffMinutes -= 24 * 60
    }
    
    if (Math.abs(diffMinutes) < 1) break
    
    utcEstimate = new Date(utcEstimate.getTime() - diffMinutes * 60 * 1000)
  }
  
  return utcEstimate.toISOString()
}

/**
 * Convert a UTC ISO string to a local datetime string for the given timezone
 * Used for displaying times in the user's timezone
 * 
 * @param utcIsoString - UTC ISO string (e.g., "2023-12-01T17:00:00.000Z")
 * @param timezone - IANA timezone (e.g., "America/New_York")
 * @returns String in format "YYYY-MM-DDTHH:MM" in the specified timezone
 */
export function utcToLocal(utcIsoString: string, timezone: string): string {
  if (!utcIsoString) return ''
  
  const utcDate = new Date(utcIsoString)
  
  // Use Intl.DateTimeFormat to get components in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  const parts = formatter.formatToParts(utcDate)
  const year = parts.find(p => p.type === 'year')?.value || ''
  const month = parts.find(p => p.type === 'month')?.value || ''
  const day = parts.find(p => p.type === 'day')?.value || ''
  const hour = parts.find(p => p.type === 'hour')?.value || '00'
  const minute = parts.find(p => p.type === 'minute')?.value || '00'
  
  return `${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/**
 * Format a UTC time for display in the user's timezone
 * Returns a localized string like "Dec 1, 2023, 12:00 PM"
 * 
 * @param utcIsoString - UTC ISO string
 * @param timezone - IANA timezone
 * @param options - Intl.DateTimeFormat options
 */
export function formatForDisplay(
  utcIsoString: string, 
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcIsoString) return ''
  
  const date = new Date(utcIsoString)
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
  
  return date.toLocaleString('en-US', options || defaultOptions)
}

/**
 * Format time only (no date) for display
 */
export function formatTimeForDisplay(
  utcIsoString: string,
  timezone: string
): string {
  if (!utcIsoString) return ''
  
  const date = new Date(utcIsoString)
  return date.toLocaleString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ============================================================================
// All-Day Event Handling (No Timezone Conversion)
// ============================================================================

/**
 * Parse a date string to a Date object representing that date
 * Used for all-day events where we don't want timezone conversion
 * 
 * @param dateString - Date in format "YYYY-MM-DD"
 * @returns Date object set to midnight UTC on that date
 */
export function parseDateOnly(dateString: string): Date {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

/**
 * Format a date for all-day events (date only, no time)
 * 
 * @param date - Date object or ISO string
 * @returns Date string in format "YYYY-MM-DD"
 */
export function formatDateOnly(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the display date for an all-day event
 * All-day events should display the same date regardless of user's timezone
 */
export function getAllDayDisplayDate(dateString: string): string {
  // Just return the date as-is, no conversion
  return dateString
}

// ============================================================================
// Recurring Event Support
// ============================================================================

/**
 * Build an RRULE string from recurrence parameters
 * 
 * @param frequency - DAILY, WEEKLY, MONTHLY, YEARLY
 * @param interval - Every N periods (default 1)
 * @param byDay - Days of week for WEEKLY (MO, TU, WE, TH, FR, SA, SU)
 * @param count - Number of occurrences (optional)
 * @param until - End date as ISO string (optional)
 */
export function buildRRule(params: {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval?: number
  byDay?: string[]
  count?: number
  until?: string
}): string {
  const parts = [`FREQ=${params.frequency}`]
  
  if (params.interval && params.interval > 1) {
    parts.push(`INTERVAL=${params.interval}`)
  }
  
  if (params.byDay && params.byDay.length > 0) {
    parts.push(`BYDAY=${params.byDay.join(',')}`)
  }
  
  if (params.count) {
    parts.push(`COUNT=${params.count}`)
  }
  
  if (params.until) {
    // UNTIL should be in UTC format: YYYYMMDDTHHMMSSZ
    const d = new Date(params.until)
    const utcString = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    parts.push(`UNTIL=${utcString}`)
  }
  
  return parts.join(';')
}

/**
 * Parse an RRULE string into its components
 */
export function parseRRule(rrule: string): {
  frequency?: string
  interval?: number
  byDay?: string[]
  count?: number
  until?: string
} {
  if (!rrule) return {}
  
  const result: ReturnType<typeof parseRRule> = {}
  
  const freqMatch = rrule.match(/FREQ=([A-Z]+)/)
  if (freqMatch) result.frequency = freqMatch[1]
  
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/)
  if (intervalMatch) result.interval = parseInt(intervalMatch[1])
  
  const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/)
  if (byDayMatch) result.byDay = byDayMatch[1].split(',')
  
  const countMatch = rrule.match(/COUNT=(\d+)/)
  if (countMatch) result.count = parseInt(countMatch[1])
  
  const untilMatch = rrule.match(/UNTIL=(\d{8}T\d{6}Z?)/)
  if (untilMatch) {
    // Parse YYYYMMDDTHHMMSSZ format back to ISO
    const u = untilMatch[1]
    const isoString = `${u.slice(0,4)}-${u.slice(4,6)}-${u.slice(6,8)}T${u.slice(9,11)}:${u.slice(11,13)}:${u.slice(13,15)}Z`
    result.until = isoString
  }
  
  return result
}

// ============================================================================
// Timezone Utilities
// ============================================================================

/**
 * Get the user's browser timezone
 */
export function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Get a list of common timezones for selection
 */
export function getCommonTimezones(): { value: string; label: string }[] {
  return [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  ]
}

/**
 * Get the current time in a specific timezone as ISO string
 */
export function nowInTimezone(timezone: string): string {
  const now = new Date()
  return utcToLocal(now.toISOString(), timezone)
}

/**
 * Check if two dates are the same day in a given timezone
 */
export function isSameDayInTimezone(date1: string, date2: string, timezone: string): boolean {
  const d1 = utcToLocal(date1, timezone).split('T')[0]
  const d2 = utcToLocal(date2, timezone).split('T')[0]
  return d1 === d2
}

// ============================================================================
// Event Time Helpers
// ============================================================================

/**
 * Prepare event times for saving to database
 * Converts from user's timezone to UTC
 */
export function prepareEventTimesForSave(
  startTimeLocal: string,
  endTimeLocal: string,
  timezone: string,
  allDay: boolean
): {
  start_time: string | null
  end_time: string | null
  start_date: string | null
  end_date: string | null
} {
  if (allDay) {
    // All-day events: use dates only, no timezone conversion
    const startDate = startTimeLocal.split('T')[0]
    const endDate = endTimeLocal.split('T')[0]
    
    return {
      start_time: null,
      end_time: null,
      start_date: startDate,
      end_date: endDate,
    }
  } else {
    // Timed events: convert to UTC
    return {
      start_time: localToUtc(startTimeLocal, timezone),
      end_time: localToUtc(endTimeLocal, timezone),
      start_date: null,
      end_date: null,
    }
  }
}

/**
 * Prepare event times for display/editing
 * Converts from UTC to user's timezone
 */
export function prepareEventTimesForDisplay(
  event: {
    start_time?: string | null
    end_time?: string | null
    start_date?: string | null
    end_date?: string | null
    all_day?: boolean
    event_timezone?: string | null
  },
  userTimezone: string
): {
  startTime: string
  endTime: string
} {
  // Use event's timezone if set, otherwise user's timezone
  const displayTimezone = event.event_timezone || userTimezone
  
  if (event.all_day && event.start_date && event.end_date) {
    // All-day events: use dates as-is with time set to midnight
    return {
      startTime: `${event.start_date}T00:00`,
      endTime: `${event.end_date}T23:59`,
    }
  } else if (event.start_time && event.end_time) {
    // Timed events: convert from UTC to display timezone
    return {
      startTime: utcToLocal(event.start_time, displayTimezone),
      endTime: utcToLocal(event.end_time, displayTimezone),
    }
  }
  
  // Fallback
  return { startTime: '', endTime: '' }
}

/**
 * Format event for FullCalendar
 * FullCalendar expects ISO strings and handles timezone via its timeZone prop
 * 
 * @param event - Event object with start_time/end_time or start_date/end_date
 * @returns Formatted event for FullCalendar with start/end and allDay flag
 */
export function formatEventForFullCalendar(
  event: {
    id: string
    title: string
    start_time?: string | null
    end_time?: string | null
    start_date?: string | null
    end_date?: string | null
    all_day?: boolean
    [key: string]: any
  }
): {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
} {
  if (event.all_day && event.start_date && event.end_date) {
    // All-day events: FullCalendar expects exclusive end date
    // So if event is Dec 1-3, end should be Dec 4
    const endDate = new Date(event.end_date)
    endDate.setDate(endDate.getDate() + 1)
    const endDateStr = formatDateOnly(endDate)
    
    return {
      id: event.id,
      title: event.title,
      start: event.start_date,
      end: endDateStr,
      allDay: true,
    }
  } else {
    // Timed events: pass UTC times directly to FullCalendar
    // FullCalendar will convert to display timezone via its timeZone prop
    return {
      id: event.id,
      title: event.title,
      start: event.start_time || '',
      end: event.end_time || '',
      allDay: false,
    }
  }
}

