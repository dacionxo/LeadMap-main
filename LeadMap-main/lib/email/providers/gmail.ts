/**
 * Gmail Email Provider
 * Uses Gmail API to send emails
 */

import { Mailbox, EmailPayload, SendResult } from '../types'

export async function gmailSend(mailbox: Mailbox, email: EmailPayload): Promise<SendResult> {
  try {
    // Check if token needs refresh
    let accessToken = mailbox.access_token
    if (mailbox.token_expires_at && mailbox.refresh_token) {
      const expiresAt = new Date(mailbox.token_expires_at)
      const now = new Date()
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

      if (expiresAt < fiveMinutesFromNow) {
        // Token is expired or about to expire, refresh it
        const refreshed = await refreshGmailToken(mailbox)
        if (!refreshed.success || !refreshed.accessToken) {
          return {
            success: false,
            error: refreshed.error || 'Failed to refresh Gmail token'
          }
        }
        accessToken = refreshed.accessToken
      }
    }

    if (!accessToken) {
      return {
        success: false,
        error: 'Gmail access token is missing'
      }
    }

    // Create MIME message
    const fromEmail = email.fromEmail || mailbox.email
    const fromName = email.fromName || mailbox.from_name || mailbox.display_name || mailbox.email
    const from = `${fromName} <${fromEmail}>`

    const message = createGmailMimeMessage(from, email.to, email.subject, email.html)

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: message
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `Gmail API error: ${response.status} ${response.statusText}`
      
      // Check for specific error codes
      if (response.status === 401) {
        return {
          success: false,
          error: 'Gmail authentication expired. Please reconnect your mailbox.'
        }
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    const data = await response.json()
    return {
      success: true,
      providerMessageId: data.id
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email via Gmail'
    }
  }
}

async function refreshGmailToken(mailbox: Mailbox): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  if (!mailbox.refresh_token) {
    return {
      success: false,
      error: 'Refresh token is missing'
    }
  }

  try {
    // Use client_id and client_secret from environment
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: 'Google OAuth credentials not configured'
      }
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: mailbox.refresh_token,
        grant_type: 'refresh_token',
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error_description || 'Failed to refresh Gmail token'
      }
    }

    const data = await response.json()
    
    // Update mailbox with new token (this should be done via API call in production)
    // For now, we'll return the new token and let the caller handle the update
    
    return {
      success: true,
      accessToken: data.access_token
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to refresh Gmail token'
    }
  }
}

function createGmailMimeMessage(from: string, to: string, subject: string, html: string): string {
  // Create a proper MIME message
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`
  
  const mimeMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html).toString('base64'),
    `--${boundary}--`
  ].join('\r\n')

  // Base64URL encode the message
  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

