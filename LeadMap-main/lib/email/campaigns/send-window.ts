/**
 * Send Window Logic
 * Ensures emails are only sent during specified time windows
 */

export interface SendWindow {
  start: string // HH:mm format
  end: string // HH:mm format
  daysOfWeek?: number[] // 1=Monday, 7=Sunday
  timezone?: string
}

export interface SendWindowCheck {
  allowed: boolean
  reason?: string
  nextAvailableTime?: Date
}

/**
 * Check if current time is within send window
 */
export function checkSendWindow(
  window: SendWindow,
  timezone: string = 'UTC'
): SendWindowCheck {
  const now = new Date()
  
  // Convert to campaign timezone
  const campaignTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const currentHour = campaignTime.getHours()
  const currentMinute = campaignTime.getMinutes()
  const currentDay = campaignTime.getDay() || 7 // Convert Sunday from 0 to 7

  // Parse window times
  const [startHour, startMinute] = window.start.split(':').map(Number)
  const [endHour, endMinute] = window.end.split(':').map(Number)

  const currentTimeMinutes = currentHour * 60 + currentMinute
  const startTimeMinutes = startHour * 60 + startMinute
  const endTimeMinutes = endHour * 60 + endMinute

  // Check day of week
  if (window.daysOfWeek && window.daysOfWeek.length > 0) {
    if (!window.daysOfWeek.includes(currentDay)) {
      // Calculate next available day
      const nextDay = findNextAvailableDay(currentDay, window.daysOfWeek)
      const nextDate = new Date(campaignTime)
      nextDate.setDate(nextDate.getDate() + (nextDay - currentDay + 7) % 7)
      nextDate.setHours(startHour, startMinute, 0, 0)

      return {
        allowed: false,
        reason: `Outside send window: today is not an allowed day. Next available: ${nextDate.toISOString()}`,
        nextAvailableTime: nextDate
      }
    }
  }

  // Check time window
  if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes >= endTimeMinutes) {
    // Calculate next available time
    const nextDate = new Date(campaignTime)
    
    if (currentTimeMinutes >= endTimeMinutes) {
      // Past end time, move to next day
      nextDate.setDate(nextDate.getDate() + 1)
    }
    
    nextDate.setHours(startHour, startMinute, 0, 0)

    return {
      allowed: false,
      reason: `Outside send window: current time ${currentHour}:${currentMinute.toString().padStart(2, '0')} is not between ${window.start} and ${window.end}`,
      nextAvailableTime: nextDate
    }
  }

  return {
    allowed: true
  }
}

/**
 * Find next available day from allowed days
 */
function findNextAvailableDay(currentDay: number, allowedDays: number[]): number {
  const sortedDays = [...allowedDays].sort((a, b) => a - b)
  
  // Find next day in same week
  for (const day of sortedDays) {
    if (day > currentDay) {
      return day
    }
  }
  
  // If no day found, return first day of next week
  return sortedDays[0]
}

