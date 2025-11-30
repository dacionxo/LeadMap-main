/**
 * Outlook Email Provider
 * Uses Microsoft Graph API to send emails
 */

import { Mailbox, EmailPayload, SendResult } from '../types'

export async function outlookSend(mailbox: Mailbox, email: EmailPayload): Promise<SendResult> {
  try {
    // Check if token needs refresh
    let accessToken = mailbox.access_token
    if (mailbox.token_expires_at && mailbox.refresh_token) {
      const expiresAt = new Date(mailbox.token_expires_at)
      const now = new Date()
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

      if (expiresAt < fiveMinutesFromNow) {
        // Token is expired or about to expire, refresh it
        const refreshed = await refreshOutlookToken(mailbox)
        if (!refreshed.success || !refreshed.accessToken) {
          return {
            success: false,
            error: refreshed.error || 'Failed to refresh Outlook token'
          }
        }
        accessToken = refreshed.accessToken
      }
    }

    if (!accessToken) {
      return {
        success: false,
        error: 'Outlook access token is missing'
      }
    }

    // Prepare email message for Microsoft Graph API
    const fromEmail = email.fromEmail || mailbox.email
    const fromName = email.fromName || mailbox.from_name || mailbox.display_name || mailbox.email
    const fromAddress = {
      emailAddress: {
        address: fromEmail,
        name: fromName
      }
    }

    const message = {
      message: {
        subject: email.subject,
        body: {
          contentType: 'HTML',
          content: email.html
        },
        from: fromAddress,
        toRecipients: [
          {
            emailAddress: {
              address: email.to
            }
          }
        ]
      }
    }

    // Send via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `Microsoft Graph API error: ${response.status} ${response.statusText}`
      
      // Check for specific error codes
      if (response.status === 401) {
        return {
          success: false,
          error: 'Outlook authentication expired. Please reconnect your mailbox.'
        }
      }

      return {
        success: false,
        error: errorMessage
      }
    }

    // Microsoft Graph doesn't return a message ID in the sendMail response
    // We'll use a timestamp-based ID or fetch it from the sent items folder
    return {
      success: true,
      providerMessageId: `outlook_${Date.now()}`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email via Outlook'
    }
  }
}

async function refreshOutlookToken(mailbox: Mailbox): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  if (!mailbox.refresh_token) {
    return {
      success: false,
      error: 'Refresh token is missing'
    }
  }

  try {
    // Use client_id and client_secret from environment
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: 'Microsoft OAuth credentials not configured'
      }
    }

    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: mailbox.refresh_token,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.Send offline_access'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error_description || 'Failed to refresh Outlook token'
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      accessToken: data.access_token
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to refresh Outlook token'
    }
  }
}

