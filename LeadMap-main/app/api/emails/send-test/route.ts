import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Send Test Email API
 * POST: Send a test email
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, html, sender_email, sender_name } = body

    if (!to || !subject || !html || !sender_email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find mailbox for sender email
    const { data: mailbox, error: mailboxError } = await supabase
      .from('mailboxes')
      .select('*')
      .eq('email', sender_email)
      .eq('user_id', user.id)
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })
    }

    // Send test email using the same logic as regular email sending
    // Import the send functions from the main send route
    const sendResult = await sendEmailViaMailbox(mailbox, to, subject, html)

    if (sendResult.success) {
      return NextResponse.json({ success: true, messageId: sendResult.messageId })
    } else {
      return NextResponse.json({ error: sendResult.error || 'Failed to send test email' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Send test email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to send email (simplified version)
async function sendEmailViaMailbox(mailbox: any, to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (mailbox.provider === 'gmail') {
      // Use Gmail API
      const emailContent = [
        `From: ${mailbox.display_name || mailbox.email} <${mailbox.email}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        html,
      ].join('\r\n')

      const encodedEmail = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mailbox.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedEmail }),
      })

      if (!response.ok) {
        return { success: false, error: 'Gmail API error' }
      }

      const data = await response.json()
      return { success: true, messageId: data.id }
    } else if (mailbox.provider === 'outlook') {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mailbox.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: 'HTML', content: html },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: true,
        }),
      })

      if (!response.ok) {
        return { success: false, error: 'Microsoft Graph API error' }
      }

      return { success: true, messageId: `outlook-${Date.now()}` }
    } else {
      return { success: false, error: 'SMTP test emails not yet supported' }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

