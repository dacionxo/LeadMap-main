/**
 * Mailbox Health Check
 * Validates mailbox connections and token validity
 */

import { Mailbox } from './types'

export interface HealthCheckResult {
  healthy: boolean
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected'
  error?: string
  responseTime?: number
  tokenValid?: boolean
  smtpValid?: boolean
}

export async function checkMailboxHealth(
  mailbox: Mailbox,
  supabase: any
): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    // Check token validity for OAuth providers
    let tokenValid = true
    if (mailbox.provider === 'gmail' || mailbox.provider === 'outlook') {
      if (!mailbox.access_token) {
        return {
          healthy: false,
          status: 'disconnected',
          error: 'Access token is missing',
          tokenValid: false
        }
      }

      // Check if token is expired
      if (mailbox.token_expires_at) {
        const expiresAt = new Date(mailbox.token_expires_at)
        const now = new Date()
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
        
        if (expiresAt < fiveMinutesFromNow) {
          tokenValid = false
          // Try to refresh if refresh_token exists
          if (mailbox.refresh_token) {
            // Token refresh would be handled by the provider-specific code
            // For now, mark as degraded
            return {
              healthy: false,
              status: 'degraded',
              error: 'Access token expired, refresh needed',
              tokenValid: false
            }
          } else {
            return {
              healthy: false,
              status: 'disconnected',
              error: 'Access token expired and no refresh token available',
              tokenValid: false
            }
          }
        }
      }

      // Test API connection
      try {
        if (mailbox.provider === 'gmail') {
          const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: {
              'Authorization': `Bearer ${mailbox.access_token}`
            }
          })
          
          if (!response.ok) {
            if (response.status === 401) {
              return {
                healthy: false,
                status: 'disconnected',
                error: 'Invalid or expired access token',
                tokenValid: false
              }
            }
            return {
              healthy: false,
              status: 'degraded',
              error: `Gmail API error: ${response.status}`,
              tokenValid: true
            }
          }
        } else if (mailbox.provider === 'outlook') {
          const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              'Authorization': `Bearer ${mailbox.access_token}`
            }
          })
          
          if (!response.ok) {
            if (response.status === 401) {
              return {
                healthy: false,
                status: 'disconnected',
                error: 'Invalid or expired access token',
                tokenValid: false
              }
            }
            return {
              healthy: false,
              status: 'degraded',
              error: `Microsoft Graph API error: ${response.status}`,
              tokenValid: true
            }
          }
        }
      } catch (apiError: any) {
        return {
          healthy: false,
          status: 'degraded',
          error: `API connection failed: ${apiError.message}`,
          tokenValid: true
        }
      }
    }

    // Check SMTP connection for SMTP providers
    let smtpValid = true
    if (mailbox.provider === 'smtp' || mailbox.provider === 'imap_smtp') {
      if (!mailbox.smtp_host || !mailbox.smtp_port || !mailbox.smtp_username || !mailbox.smtp_password) {
        return {
          healthy: false,
          status: 'disconnected',
          error: 'SMTP credentials are missing',
          smtpValid: false
        }
      }
      
      // Note: Full SMTP connection test would require a library like nodemailer
      // For now, we just validate that credentials exist
      smtpValid = true
    }

    const responseTime = Date.now() - startTime

    return {
      healthy: true,
      status: 'healthy',
      responseTime,
      tokenValid,
      smtpValid
    }
  } catch (error: any) {
    return {
      healthy: false,
      status: 'unhealthy',
      error: error.message || 'Health check failed',
      responseTime: Date.now() - startTime
    }
  }
}

