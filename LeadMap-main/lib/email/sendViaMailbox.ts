/**
 * Send Email Via Mailbox
 * Routes emails to the appropriate provider based on mailbox configuration
 */

import { Mailbox, EmailPayload, SendResult } from './types'
import { gmailSend } from './providers/gmail'
import { outlookSend } from './providers/outlook'
import { smtpSend } from './providers/smtp'

export async function sendViaMailbox(
  mailbox: Mailbox,
  email: EmailPayload
): Promise<SendResult> {
  try {
    // Validate mailbox is active
    if (!mailbox.active) {
      return {
        success: false,
        error: 'Mailbox is not active'
      }
    }

    // Route to appropriate provider
    switch (mailbox.provider) {
      case 'gmail':
        return await gmailSend(mailbox, email)
      
      case 'outlook':
        return await outlookSend(mailbox, email)
      
      case 'smtp':
        return await smtpSend(mailbox, email)
      
      default:
        return {
          success: false,
          error: `Unsupported provider: ${mailbox.provider}`
        }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email via mailbox'
    }
  }
}

/**
 * Check mailbox rate limits
 * Returns whether sending is allowed and how many can be sent
 */
export async function checkMailboxLimits(
  mailbox: Mailbox,
  sentCounts: { hourly: number; daily: number }
): Promise<{ allowed: boolean; reason?: string; remainingHourly?: number; remainingDaily?: number }> {
  const { hourly, daily } = sentCounts

  // Check hourly limit
  if (hourly >= mailbox.hourly_limit) {
    return {
      allowed: false,
      reason: `Hourly limit of ${mailbox.hourly_limit} emails reached`,
      remainingHourly: 0,
      remainingDaily: Math.max(0, mailbox.daily_limit - daily)
    }
  }

  // Check daily limit
  if (daily >= mailbox.daily_limit) {
    return {
      allowed: false,
      reason: `Daily limit of ${mailbox.daily_limit} emails reached`,
      remainingHourly: Math.max(0, mailbox.hourly_limit - hourly),
      remainingDaily: 0
    }
  }

  return {
    allowed: true,
    remainingHourly: mailbox.hourly_limit - hourly,
    remainingDaily: mailbox.daily_limit - daily
  }
}

