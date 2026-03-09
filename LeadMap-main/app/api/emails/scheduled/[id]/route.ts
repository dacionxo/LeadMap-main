/**
 * GET /api/emails/scheduled/[id] - Fetch a single scheduled email
 * DELETE /api/emails/scheduled/[id] - Cancel a scheduled email
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: row, error } = await supabaseAdmin
      .from('email_queue')
      .select('id, mailbox_id, to_email, subject, html, from_name, from_email, scheduled_at, status, created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 })
    }

    return NextResponse.json({ scheduled: row })
  } catch (err: unknown) {
    console.error('[GET /api/emails/scheduled/[id]] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled email' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 })
    }

    if (existing.status !== 'queued' && existing.status !== 'processing') {
      return NextResponse.json(
        { error: 'Email is no longer scheduled (may have been sent or cancelled)' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('email_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[DELETE /api/emails/scheduled/[id]] Error:', updateError)
      return NextResponse.json({ error: 'Failed to cancel scheduled email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Scheduled email cancelled' })
  } catch (err: unknown) {
    console.error('[DELETE /api/emails/scheduled/[id]] Error:', err)
    return NextResponse.json(
      { error: 'Failed to cancel scheduled email' },
      { status: 500 }
    )
  }
}
