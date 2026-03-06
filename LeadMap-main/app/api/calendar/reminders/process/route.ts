import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronRequestOrError } from '@/lib/cron/auth'
import { sendEmail } from '@/lib/sendEmail'

export const runtime = 'nodejs'

/**
 * Calendar Reminders Process Cron Job
 * Process and send reminders (called by cron job)
 * This endpoint is called by Vercel Cron or external scheduler
 * 
 * Vercel Cron calls with GET, but we also support POST for manual triggers
 */
async function runCronJob(request: NextRequest) {
  try {
    const authError = verifyCronRequestOrError(request)
    if (authError) return authError

    // Use service role for queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get due reminders
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    const { data: reminders, error: fetchError } = await supabase
      .from('calendar_reminders')
      .select(`
        *,
        calendar_events (
          id,
          title,
          start_time,
          end_time,
          location,
          description,
          user_id
        )
      `)
      .eq('status', 'pending')
      .lte('reminder_time', fiveMinutesFromNow.toISOString())
      .order('reminder_time', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    const results = []

    for (const reminder of reminders || []) {
      try {
        const event = reminder.calendar_events as any
        if (!event) continue

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(event.user_id)
        const userEmail = userData?.user?.email

        if (!userEmail) continue

        // Send reminder notification
        const reminderSent = await sendReminderNotification({
          reminder,
          event,
          userEmail,
        })

        if (reminderSent) {
          // Mark reminder as sent
          await supabase
            .from('calendar_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              sent_via: 'email',
            })
            .eq('id', reminder.id)

          results.push({ reminderId: reminder.id, status: 'sent' })
        } else {
          // Mark as failed
          await supabase
            .from('calendar_reminders')
            .update({ status: 'failed' })
            .eq('id', reminder.id)

          results.push({ reminderId: reminder.id, status: 'failed' })
        }
      } catch (error: any) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
        await supabase
          .from('calendar_reminders')
          .update({ status: 'failed' })
          .eq('id', reminder.id)

        results.push({ reminderId: reminder.id, status: 'failed', error: error.message })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/reminders/process:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Vercel Cron calls with GET, but we also support POST for manual triggers
export async function GET(request: NextRequest) {
  return runCronJob(request)
}

export async function POST(request: NextRequest) {
  return runCronJob(request)
}

/**
 * Send reminder notification
 */
async function sendReminderNotification({
  reminder,
  event,
  userEmail,
}: {
  reminder: any
  event: any
  userEmail: string
}) {
  try {
    // Format event time
    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)
    const reminderMinutes = reminder.reminder_minutes

    const subject = `Reminder: ${event.title} in ${reminderMinutes} minutes`
    const calendarUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/dashboard/crm/calendar`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">Event Reminder</h2>
        <p><strong>${event.title}</strong></p>
        <p><strong>Time:</strong> ${eventStart.toLocaleString()} - ${eventEnd.toLocaleString()}</p>
        ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
        ${event.description ? `<p>${event.description}</p>` : ''}
        <p style="color: #6b7280; font-size: 14px; margin-top: 18px;">
          This is a reminder that your event starts in ${reminderMinutes} minutes.
        </p>
        <p style="margin-top: 18px;">
          <a href="${calendarUrl}" style="background: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Open Calendar
          </a>
        </p>
      </div>
    `

    const ok = await sendEmail({
      to: userEmail,
      subject,
      html,
      from: process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || undefined,
    })

    return ok
  } catch (error) {
    console.error('Error sending reminder notification:', error)
    return false
  }
}

