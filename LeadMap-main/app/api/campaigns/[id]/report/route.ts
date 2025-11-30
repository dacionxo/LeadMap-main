import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Campaign Report API
 * GET /api/campaigns/[id]/report - Get campaign statistics and reports
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

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
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get daily reports
    let reportsQuery = supabaseAdmin
      .from('campaign_reports')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('report_date', { ascending: false })

    if (startDate) {
      reportsQuery = reportsQuery.gte('report_date', startDate)
    }
    if (endDate) {
      reportsQuery = reportsQuery.lte('report_date', endDate)
    }

    const { data: reports, error: reportsError } = await reportsQuery

    if (reportsError) {
      console.error('Reports fetch error:', reportsError)
    }

    // Calculate overall stats
    const { data: recipients } = await supabaseAdmin
      .from('campaign_recipients')
      .select('status, replied, bounced, unsubscribed')
      .eq('campaign_id', campaignId)

    const { data: emails } = await supabaseAdmin
      .from('emails')
      .select('status, opened_at, clicked_at, sent_at')
      .eq('campaign_id', campaignId)

    // Aggregate stats
    const totalRecipients = recipients?.length || 0
    const emailsSent = emails?.filter(e => e.status === 'sent').length || 0
    const emailsDelivered = emails?.filter(e => e.status === 'sent' && e.sent_at).length || 0
    const emailsOpened = emails?.filter(e => e.opened_at).length || 0
    const emailsClicked = emails?.filter(e => e.clicked_at).length || 0
    const emailsReplied = recipients?.filter(r => r.replied).length || 0
    const emailsBounced = recipients?.filter(r => r.bounced).length || 0
    const emailsUnsubscribed = recipients?.filter(r => r.unsubscribed).length || 0

    const overallStats = {
      total_recipients: totalRecipients,
      emails_sent: emailsSent,
      emails_delivered: emailsDelivered,
      emails_opened: emailsOpened,
      emails_clicked: emailsClicked,
      emails_replied: emailsReplied,
      emails_bounced: emailsBounced,
      emails_unsubscribed: emailsUnsubscribed,
      delivery_rate: emailsSent > 0 ? (emailsDelivered / emailsSent * 100).toFixed(2) : 0,
      open_rate: emailsDelivered > 0 ? (emailsOpened / emailsDelivered * 100).toFixed(2) : 0,
      click_rate: emailsDelivered > 0 ? (emailsClicked / emailsDelivered * 100).toFixed(2) : 0,
      reply_rate: emailsDelivered > 0 ? (emailsReplied / emailsDelivered * 100).toFixed(2) : 0,
      bounce_rate: emailsSent > 0 ? (emailsBounced / emailsSent * 100).toFixed(2) : 0,
      unsubscribe_rate: emailsDelivered > 0 ? (emailsUnsubscribed / emailsDelivered * 100).toFixed(2) : 0
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name
      },
      overall_stats: overallStats,
      daily_reports: reports || []
    })
  } catch (error: any) {
    console.error('Campaign report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

