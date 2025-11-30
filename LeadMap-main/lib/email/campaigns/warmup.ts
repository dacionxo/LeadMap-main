/**
 * Campaign Warmup Logic
 * Gradually increases sending volume for new domains/mailboxes
 */

export interface WarmupSchedule {
  [key: string]: number // e.g., { "day_1": 10, "day_2": 20, "day_3": 50 }
}

export interface WarmupResult {
  allowed: boolean
  limit?: number
  currentDay?: number
  reason?: string
}

/**
 * Default warmup schedule (emails per day)
 */
export const DEFAULT_WARMUP_SCHEDULE: WarmupSchedule = {
  day_1: 10,
  day_2: 20,
  day_3: 30,
  day_4: 50,
  day_5: 75,
  day_6: 100,
  day_7: 150,
  day_8: 200,
  day_9: 300,
  day_10: 400,
  day_11: 500,
  day_12: 600,
  day_13: 700,
  day_14: 800,
  day_15: 900,
  day_16: 1000,
  day_17: 1100,
  day_18: 1200,
  day_19: 1300,
  day_20: 1400,
  day_21: 1500,
  day_22: 1600,
  day_23: 1700,
  day_24: 1800,
  day_25: 1900,
  day_26: 2000,
  day_27: 2100,
  day_28: 2200,
  day_29: 2300,
  day_30: 2400
}

/**
 * Check warmup limits for campaign
 */
export function checkWarmupLimit(
  warmupEnabled: boolean,
  currentWarmupDay: number,
  warmupSchedule?: WarmupSchedule | null,
  emailsSentToday?: number
): WarmupResult {
  if (!warmupEnabled) {
    return {
      allowed: true,
      limit: undefined // No limit
    }
  }

  const schedule = warmupSchedule || DEFAULT_WARMUP_SCHEDULE
  const dayKey = `day_${currentWarmupDay}`
  const limit = schedule[dayKey] || schedule[`day_${Object.keys(schedule).length}`] || 1000

  const sentToday = emailsSentToday || 0

  if (sentToday >= limit) {
    return {
      allowed: false,
      limit,
      currentDay: currentWarmupDay,
      reason: `Warmup limit reached: ${sentToday}/${limit} emails today (day ${currentWarmupDay})`
    }
  }

  return {
    allowed: true,
    limit,
    currentDay: currentWarmupDay
  }
}

/**
 * Calculate next warmup day
 */
export function calculateNextWarmupDay(
  campaignStartDate: Date,
  currentDay: number
): number {
  const now = new Date()
  const daysSinceStart = Math.floor(
    (now.getTime() - campaignStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return Math.max(currentDay, daysSinceStart + 1)
}

