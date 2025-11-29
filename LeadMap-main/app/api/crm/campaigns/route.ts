import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Campaigns API
 * GET: List user's campaigns
 * POST: Create new campaign
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data || [] })
  } catch (error) {
    console.error('Campaigns GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
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

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        user_id: user.id,
        name: name || 'Untitled campaign',
        description: '',
        sender_email: sender_email || null,
        sender_name: sender_name || null,
        subject: subject || null,
        preview_text: preview_text || null,
        html_content: html_content || null,
        reply_to: reply_to || null,
        send_type: send_type || 'now',
        recipient_type: recipient_type || 'contacts',
        recipient_ids: recipient_ids && Array.isArray(recipient_ids) ? recipient_ids : [],
        track_clicks: track_clicks || false,
        utm_tracking: utm_tracking || false,
        add_tags: add_tags || false,
        resend_unopened: resend_unopened || false,
        status: scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: scheduled_at || null,
      })
      .select()
      .single()

    if (campaignError) {
      console.error('Database error:', campaignError)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    // Store campaign details in a separate table or as JSON
    // For now, we'll extend the email_campaigns table or use a campaigns_metadata table
    // This is a simplified version - you may want to create a campaigns_details table

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Campaigns POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

