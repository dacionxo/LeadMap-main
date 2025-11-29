import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Campaign API
 * GET: Get campaign by ID
 * PUT: Update campaign
 * DELETE: Delete campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Parse recipient_ids if it's stored as JSONB
    if (data.recipient_ids && typeof data.recipient_ids === 'string') {
      try {
        data.recipient_ids = JSON.parse(data.recipient_ids)
      } catch {
        data.recipient_ids = []
      }
    }

    return NextResponse.json({ campaign: data })
  } catch (error) {
    console.error('Get campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      sender_email,
      sender_name,
      subject,
      preview_text,
      html_content,
      reply_to,
      send_type,
      scheduled_at,
      recipient_type,
      recipient_ids,
      track_clicks,
      utm_tracking,
      add_tags,
      resend_unopened,
    } = body

    const updateData: any = {
      name: name || 'Untitled campaign',
      updated_at: new Date().toISOString(),
    }

    if (sender_email !== undefined) updateData.sender_email = sender_email
    if (sender_name !== undefined) updateData.sender_name = sender_name
    if (subject !== undefined) updateData.subject = subject
    if (preview_text !== undefined) updateData.preview_text = preview_text
    if (html_content !== undefined) updateData.html_content = html_content
    if (reply_to !== undefined) updateData.reply_to = reply_to
    if (send_type !== undefined) updateData.send_type = send_type
    if (recipient_type !== undefined) updateData.recipient_type = recipient_type
    if (recipient_ids !== undefined) {
      updateData.recipient_ids = Array.isArray(recipient_ids) ? recipient_ids : []
    }
    if (track_clicks !== undefined) updateData.track_clicks = track_clicks
    if (utm_tracking !== undefined) updateData.utm_tracking = utm_tracking
    if (add_tags !== undefined) updateData.add_tags = add_tags
    if (resend_unopened !== undefined) updateData.resend_unopened = resend_unopened

    if (scheduled_at) {
      updateData.scheduled_at = scheduled_at
      updateData.status = 'scheduled'
    } else if (send_type === 'now') {
      updateData.status = 'draft'
    }

    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: data })
  } catch (error) {
    console.error('Update campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

