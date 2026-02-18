/**
 * Trial reminders cron
 *
 * Sends one in-app notification per user on each of the last 7 days of their free trial.
 * Run daily (e.g. 9:00 AM). Uses notify_user_with_code with notification_code 'trial_reminder'.
 *
 * Auth: CRON_SECRET or CALENDAR_SERVICE_KEY (see lib/cron/auth).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequestOrError } from '@/lib/cron/auth'
import { getServiceRoleClient } from '@/lib/supabase-singleton'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authError = verifyCronRequestOrError(request)
  if (authError) return authError

  const supabase = getServiceRoleClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let sent = 0
  let skipped = 0

  try {
    // Users with trial_end in the next 1–7 days who are not subscribed
    const { data: users, error: selectError } = await (supabase
      .from('users') as any)
      .select('id, trial_end, subscription_status, is_subscribed')
      .or('subscription_status.eq.none,subscription_status.eq.trialing')
      .eq('is_subscribed', false)

    if (selectError) {
      console.error('Trial reminders: select error', selectError)
      return NextResponse.json({ error: selectError.message, sent, skipped }, { status: 500 })
    }

    if (!users?.length) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 0, message: 'No trial users' })
    }

    for (const user of users) {
      const trialEnd = user.trial_end ? new Date(user.trial_end) : null
      if (!trialEnd || Number.isNaN(trialEnd.getTime())) continue

      trialEnd.setHours(0, 0, 0, 0)
      const diffMs = trialEnd.getTime() - today.getTime()
      const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

      if (diffDays < 1 || diffDays > 7) continue

      const daysLabel = diffDays === 1 ? '1 day' : `${diffDays} days`
      const title = 'Free trial ending soon'
      const message = `${daysLabel} left in your free trial. Upgrade to keep your data and continue.`
      const link = '/dashboard/billing'

      // Avoid duplicate reminder same day: check for existing trial_reminder today
      const startOfToday = new Date(today)
      startOfToday.setUTCHours(0, 0, 0, 0)
      const endOfToday = new Date(today)
      endOfToday.setUTCHours(23, 59, 59, 999)

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('notification_code', 'trial_reminder')
        .gte('created_at', startOfToday.toISOString())
        .lte('created_at', endOfToday.toISOString())
        .limit(1)

      if (existing?.length) {
        skipped++
        continue
      }

      const { error: insertError } = await (supabase.from('notifications') as any).insert({
        user_id: user.id,
        type: 'warning',
        title,
        message,
        link,
        notification_code: 'trial_reminder',
        read: false,
      })

      if (insertError) {
        console.error('Trial reminder insert error', user.id, insertError)
        continue
      }
      sent++
    }

    return NextResponse.json({ ok: true, sent, skipped })
  } catch (err) {
    console.error('Trial reminders cron error', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Trial reminders failed', sent, skipped },
      { status: 500 }
    )
  }
}
