import { NextRequest, NextResponse } from 'next/server'
import { getRouteHandlerClient } from '@/lib/supabase-singleton'

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .select('id')

    if (error) {
      console.error('Notifications mark-all-read error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      marked: data?.length ?? 0,
      message: `Marked ${data?.length ?? 0} notifications as read`,
    })
  } catch (error) {
    console.error('Notifications mark-all-read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
