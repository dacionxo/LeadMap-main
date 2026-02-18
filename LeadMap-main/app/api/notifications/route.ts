import { NextRequest, NextResponse } from 'next/server'
import { getRouteHandlerClient } from '@/lib/supabase-singleton'

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 * Query: ?unread_only=true to filter unread only
 * Query: ?limit=20 (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    let query = supabase
      .from('notifications')
      .select('id, type, title, message, link, attachment, read, created_at, notification_code')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Notifications GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notifications: data || [] })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
