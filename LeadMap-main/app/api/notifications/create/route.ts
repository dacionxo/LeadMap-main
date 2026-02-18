import { NextRequest, NextResponse } from 'next/server'
import { getRouteHandlerClient } from '@/lib/supabase-singleton'

const VALID_NOTIFICATION_CODES = [
  'sequence_alert',
  'trial_reminder',
  'plan_overdue',
  'account_overdue',
  'autopay_failed',
  'subscription_upgrade',
] as const

/**
 * POST /api/notifications/create
 * Create a notification for the authenticated user
 * Body: { title: string, message: string, type?: 'comment'|'system'|'file'|'warning', link?: string, attachment?: string, notification_code?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, message, type = 'system', link, attachment, notification_code } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    const validTypes = ['comment', 'system', 'file', 'warning']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (notification_code != null && !VALID_NOTIFICATION_CODES.includes(notification_code)) {
      return NextResponse.json(
        { error: `notification_code must be one of: ${VALID_NOTIFICATION_CODES.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type: type || 'system',
        link: link || null,
        attachment: attachment || null,
        notification_code: notification_code || null,
        read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Notifications create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notification: data }, { status: 201 })
  } catch (error) {
    console.error('Notifications create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
