/**
 * POST /api/notifications/apollo-autopay-failed
 * Create an "autopay failed" notification for the authenticated user.
 * Call this when Apollo autopay fails (e.g. from a webhook or sync job that has user context).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRouteHandlerClient } from '@/lib/supabase-singleton'

export async function POST(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const message =
      typeof body.message === 'string'
        ? body.message
        : 'Apollo autopay failed. Please update your payment method in Billing.'

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'warning',
        title: 'Apollo autopay failed',
        message,
        link: '/dashboard/billing',
        notification_code: 'autopay_failed',
        read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Apollo autopay notification error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notification: data }, { status: 201 })
  } catch (error) {
    console.error('Apollo autopay notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
