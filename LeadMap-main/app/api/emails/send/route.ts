import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Send Email API
 * POST: Send an email through a selected mailbox
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      mailboxId,
      to,
      subject,
      html,
      templateId,
      scheduleAt,
    } = body

    if (!mailboxId || !to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch mailbox
    const { data: mailbox, error: mailboxError } = await supabase
      .from('mailboxes')
      .select('*')
      .eq('id', mailboxId)
      .eq('user_id', user.id)
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })
    }

    if (!mailbox.active) {
      return NextResponse.json({ error: 'Mailbox is not active' }, { status: 400 })
    }

    // Check rate limits if sending now
    const now = new Date()
    const scheduleDate = scheduleAt ? new Date(scheduleAt) : null
    const isScheduled = scheduleDate && scheduleDate > now

    if (!isScheduled) {
      // Check hourly limit
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const { count: hourlyCount } = await supabase
        .from('emails')
        .select('id', { count: 'exact', head: true })
        .eq('mailbox_id', mailboxId)
        .eq('status', 'sent')
        .gte('sent_at', oneHourAgo.toISOString())

      if ((hourlyCount || 0) >= mailbox.hourly_limit) {
        return NextResponse.json({ 
          error: `Hourly limit reached (${mailbox.hourly_limit} emails/hour)` 
        }, { status: 429 })
      }

      // Check daily limit
      const todayStart = new Date(now.setHours(0, 0, 0, 0))
      const { count: dailyCount } = await supabase
        .from('emails')
        .select('id', { count: 'exact', head: true })
        .eq('mailbox_id', mailboxId)
        .eq('status', 'sent')
        .gte('sent_at', todayStart.toISOString())

      if ((dailyCount || 0) >= mailbox.daily_limit) {
        return NextResponse.json({ 
          error: `Daily limit reached (${mailbox.daily_limit} emails/day)` 
        }, { status: 429 })
      }
    }

    // Create email record
    const emailData: any = {
      user_id: user.id,
      mailbox_id: mailboxId,
      to_email: to,
      subject,
      html,
      status: isScheduled ? 'queued' : 'sending',
      scheduled_at: scheduleDate?.toISOString() || null,
    }

    if (templateId) {
      emailData.template_id = templateId
    }

    const { data: emailRecord, error: emailError } = await supabase
      .from('emails')
      .insert(emailData)
      .select()
      .single()

    if (emailError) {
      console.error('Database error:', emailError)
      return NextResponse.json({ error: 'Failed to create email record' }, { status: 500 })
    }

    // If scheduled, return success
    if (isScheduled) {
      return NextResponse.json({ 
        success: true, 
        email: emailRecord,
        message: 'Email scheduled successfully' 
      })
    }

    // Send email immediately
    let sendResult: { success: boolean; messageId?: string; error?: string } = { success: false }

    try {
      if (mailbox.provider === 'gmail') {
        sendResult = await sendViaGmail(mailbox, to, subject, html)
      } else if (mailbox.provider === 'outlook') {
        sendResult = await sendViaOutlook(mailbox, to, subject, html)
      } else if (mailbox.provider === 'smtp') {
        sendResult = await sendViaSMTP(mailbox, to, subject, html)
      } else {
        throw new Error('Unsupported provider')
      }

      // Update email record
      const updateData: any = {
        status: sendResult.success ? 'sent' : 'failed',
        sent_at: sendResult.success ? new Date().toISOString() : null,
        provider_message_id: sendResult.messageId || null,
        error: sendResult.error || null,
      }

      await supabase
        .from('emails')
        .update(updateData)
        .eq('id', emailRecord.id)

      if (sendResult.success) {
        return NextResponse.json({ 
          success: true, 
          email: { ...emailRecord, ...updateData },
          messageId: sendResult.messageId 
        })
      } else {
        return NextResponse.json({ 
          error: sendResult.error || 'Failed to send email' 
        }, { status: 500 })
      }
    } catch (error: any) {
      // Update email record with error
      await supabase
        .from('emails')
        .update({
          status: 'failed',
          error: error.message || 'Unknown error',
        })
        .eq('id', emailRecord.id)

      return NextResponse.json({ 
        error: error.message || 'Failed to send email' 
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Send email via Gmail API
 */
async function sendViaGmail(mailbox: any, to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if token needs refresh
    let accessToken = mailbox.access_token
    if (mailbox.token_expires_at && new Date(mailbox.token_expires_at) < new Date()) {
      // Refresh token
      const refreshed = await refreshGmailToken(mailbox.refresh_token)
      if (!refreshed.success) {
        return { success: false, error: 'Failed to refresh Gmail token' }
      }
      accessToken = refreshed.access_token
      
      // Update mailbox with new token
      const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
      await supabase
        .from('mailboxes')
        .update({
          access_token: refreshed.access_token,
          token_expires_at: refreshed.expires_at,
        })
        .eq('id', mailbox.id)
    }

    // Build RFC 2822 email
    const fromEmail = mailbox.email
    const fromName = mailbox.display_name || mailbox.email
    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html,
    ].join('\r\n')

    // Base64URL encode
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Gmail API error: ${error}` }
    }

    const data = await response.json()
    return { success: true, messageId: data.id }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gmail send failed' }
  }
}

/**
 * Send email via Outlook/Microsoft Graph API
 */
async function sendViaOutlook(mailbox: any, to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if token needs refresh
    let accessToken = mailbox.access_token
    if (mailbox.token_expires_at && new Date(mailbox.token_expires_at) < new Date()) {
      // Refresh token
      const refreshed = await refreshOutlookToken(mailbox.refresh_token)
      if (!refreshed.success) {
        return { success: false, error: 'Failed to refresh Outlook token' }
      }
      accessToken = refreshed.access_token
      
      // Update mailbox with new token
      const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
      await supabase
        .from('mailboxes')
        .update({
          access_token: refreshed.access_token,
          token_expires_at: refreshed.expires_at,
        })
        .eq('id', mailbox.id)
    }

    // Send via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: html,
          },
          toRecipients: [
            {
              emailAddress: {
                address: to,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error: `Microsoft Graph API error: ${error}` }
    }

    // Outlook doesn't return a message ID in sendMail, but we can use a timestamp
    return { success: true, messageId: `outlook-${Date.now()}` }
  } catch (error: any) {
    return { success: false, error: error.message || 'Outlook send failed' }
  }
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(mailbox: any, to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Use nodemailer for SMTP
    let nodemailer: any
    try {
      nodemailer = await import('nodemailer')
    } catch {
      return { success: false, error: 'Nodemailer not available. Install: npm install nodemailer' }
    }

    const transporter = nodemailer.createTransport({
      host: mailbox.smtp_host,
      port: mailbox.smtp_port,
      secure: mailbox.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: mailbox.smtp_username,
        pass: mailbox.smtp_password,
      },
    })

    const info = await transporter.sendMail({
      from: `"${mailbox.from_name || mailbox.email}" <${mailbox.from_email || mailbox.email}>`,
      to,
      subject,
      html,
    })

    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    return { success: false, error: error.message || 'SMTP send failed' }
  }
}

/**
 * Refresh Gmail access token
 */
async function refreshGmailToken(refreshToken: string): Promise<{ success: boolean; access_token?: string; expires_at?: string; error?: string }> {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Google OAuth not configured' }
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to refresh token' }
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString()

    return {
      success: true,
      access_token: data.access_token,
      expires_at: expiresAt,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Refresh Outlook access token
 */
async function refreshOutlookToken(refreshToken: string): Promise<{ success: boolean; access_token?: string; expires_at?: string; error?: string }> {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Microsoft OAuth not configured' }
    }

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.Send offline_access',
      }),
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to refresh token' }
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString()

    return {
      success: true,
      access_token: data.access_token,
      expires_at: expiresAt,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

