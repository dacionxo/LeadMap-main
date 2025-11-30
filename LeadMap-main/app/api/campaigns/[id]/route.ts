import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Campaign API by ID
 * GET: Get campaign details
 * PATCH: Update campaign
 */

export async function GET(
  request: NextRequest,
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

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get campaign steps
    const { data: steps } = await supabase
      .from('campaign_steps')
      .select('*')
      .eq('campaign_id', id)
      .order('step_number', { ascending: true })

    // Get campaign recipients with stats
    const { data: recipients } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', id)

    // Get mailbox info
    const { data: mailbox } = await supabase
      .from('mailboxes')
      .select('id, email, display_name, provider')
      .eq('id', campaign.mailbox_id)
      .single()

    // Get email stats
    const { data: emails } = await supabase
      .from('emails')
      .select('status, sent_at')
      .eq('campaign_id', id)

    interface EmailStat {
      status: string
      sent_at: string | null
    }

    interface RecipientStat {
      status: string
    }

    const totalSent = emails?.filter((e: EmailStat) => e.status === 'sent').length || 0
    const totalFailed = emails?.filter((e: EmailStat) => e.status === 'failed').length || 0
    const totalQueued = emails?.filter((e: EmailStat) => e.status === 'queued' || e.status === 'sending').length || 0

    return NextResponse.json({
      campaign: {
        ...campaign,
        mailbox,
        steps: steps || [],
        recipients: recipients || [],
        stats: {
          total_recipients: recipients?.length || 0,
          total_sent: totalSent,
          total_failed: totalFailed,
          total_queued: totalQueued,
          completed: recipients?.filter((r: RecipientStat) => r.status === 'completed').length || 0,
          pending: recipients?.filter((r: RecipientStat) => r.status === 'pending' || r.status === 'queued').length || 0,
          bounced: recipients?.filter((r: RecipientStat) => r.status === 'bounced').length || 0,
          unsubscribed: recipients?.filter((r: RecipientStat) => r.status === 'unsubscribed').length || 0
        }
      }
    })
  } catch (error) {
    console.error('Campaign GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
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

    // Verify campaign belongs to user
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: any = {}

    // Allowed fields to update
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.start_at !== undefined) updates.start_at = body.start_at
    if (body.timezone !== undefined) updates.timezone = body.timezone
    if (body.status !== undefined) {
      // Validate status transition
      const allowedTransitions: Record<string, string[]> = {
        'draft': ['scheduled', 'running', 'cancelled'],
        'scheduled': ['running', 'paused', 'cancelled'],
        'running': ['paused', 'completed', 'cancelled'],
        'paused': ['running', 'cancelled'],
        'completed': [],
        'cancelled': []
      }

      const currentStatus = existingCampaign.status
      const allowed = allowedTransitions[currentStatus] || []

      if (!allowed.includes(body.status)) {
        return NextResponse.json({
          error: `Cannot transition from ${currentStatus} to ${body.status}`
        }, { status: 400 })
      }

      updates.status = body.status

      // Auto-set start_at if starting now
      if (body.status === 'running' && !existingCampaign.start_at) {
        updates.start_at = new Date().toISOString()
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Campaign update error:', updateError)
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Campaign PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

