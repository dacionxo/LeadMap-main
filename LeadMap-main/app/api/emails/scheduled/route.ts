/**
 * GET /api/emails/scheduled
 * Returns scheduled (queued/processing) emails for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
    const search = (searchParams.get('search') || '').trim().toLowerCase()

    const { data: rows, error } = await supabaseAdmin
      .from('email_queue')
      .select('id, mailbox_id, to_email, subject, html, from_name, from_email, scheduled_at, status, created_at')
      .eq('user_id', user.id)
      .in('status', ['queued', 'processing'])
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(limit)

    if (error) {
      console.error('[GET /api/emails/scheduled] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch scheduled emails' }, { status: 500 })
    }

    let scheduled = rows || []

    if (search) {
      scheduled = scheduled.filter(
        (r: { subject?: string; to_email?: string }) =>
          (r.subject || '').toLowerCase().includes(search) ||
          (r.to_email || '').toLowerCase().includes(search)
      )
    }

    return NextResponse.json({ scheduled })
  } catch (err: unknown) {
    console.error('[GET /api/emails/scheduled] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled emails' },
      { status: 500 }
    )
  }
}
