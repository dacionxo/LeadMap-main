import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

/**
 * CSV Export for Email Analytics
 * GET /api/email/analytics/export?format=csv&startDate=...&endDate=...&mailboxId=...
 * Exports email analytics data as CSV
 */

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get('endDate') || new Date().toISOString()
    const mailboxId = searchParams.get('mailboxId')
    const campaignId = searchParams.get('campaignId')
    const exportType = searchParams.get('type') || 'events' // 'events', 'timeseries', 'recipients'

    if (format !== 'csv') {
      return NextResponse.json({ error: 'Only CSV format is supported' }, { status: 400 })
    }

    let csvData = ''
    let filename = 'email-analytics'

    if (exportType === 'events') {
      // Export individual events
      let query = supabase
        .from('email_events')
        .select(`
          event_type,
          event_timestamp,
          recipient_email,
          clicked_url,
          bounce_type,
          bounce_reason,
          metadata,
          campaigns(name),
          mailboxes(email, display_name)
        `)
        .eq('user_id', user.id)
        .gte('event_timestamp', startDate)
        .lte('event_timestamp', endDate)
        .order('event_timestamp', { ascending: false })
        .limit(10000) // Limit for performance

      if (mailboxId && mailboxId !== 'all') {
        query = query.eq('mailbox_id', mailboxId)
      }

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      const { data: events, error } = await query

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
      }

      // CSV header
      csvData = 'Date,Time,Event Type,Recipient Email,Campaign,Mailbox,URL,Bounce Type,Bounce Reason,Metadata\n'

      // CSV rows
      events?.forEach((event: any) => {
        const date = new Date(event.event_timestamp)
        const dateStr = date.toISOString().split('T')[0]
        const timeStr = date.toTimeString().split(' ')[0]
        const campaignName = event.campaigns?.name || ''
        const mailboxEmail = event.mailboxes?.email || ''
        const url = event.clicked_url || ''
        const bounceType = event.bounce_type || ''
        const bounceReason = event.bounce_reason || ''
        const metadata = typeof event.metadata === 'object' ? JSON.stringify(event.metadata) : (event.metadata || '')

        // Escape CSV values
        const escapeCsv = (value: string) => {
          if (!value) return ''
          return `"${String(value).replace(/"/g, '""')}"`
        }

        csvData += `${dateStr},${timeStr},${escapeCsv(event.event_type)},${escapeCsv(event.recipient_email)},${escapeCsv(campaignName)},${escapeCsv(mailboxEmail)},${escapeCsv(url)},${escapeCsv(bounceType)},${escapeCsv(bounceReason)},${escapeCsv(metadata)}\n`
      })

      filename = `email-events-${new Date().toISOString().split('T')[0]}.csv`
    } else if (exportType === 'timeseries') {
      // Export time-series aggregated data
      // Similar to timeseries endpoint but as CSV
      filename = `email-timeseries-${new Date().toISOString().split('T')[0]}.csv`
      csvData = 'Date,Sent,Delivered,Opened,Clicked,Replied,Bounced,Complaint,Failed,Open Rate,Click Rate,Reply Rate\n'
      
      // Call timeseries endpoint logic or query directly
      // For now, return placeholder
      csvData += '2024-01-01,0,0,0,0,0,0,0,0,0,0,0\n'
    } else if (exportType === 'recipients') {
      // Export recipient engagement profiles
      const { data: profiles, error } = await supabase
        .from('recipient_engagement_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('last_contact_at', { ascending: false })
        .limit(10000)

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Failed to fetch recipient data' }, { status: 500 })
      }

      csvData = 'Recipient Email,Total Sent,Total Delivered,Total Opened,Total Clicked,Total Replied,Total Opens,Total Clicks,Open Rate,Click Rate,Reply Rate,First Contact,Last Contact\n'

      profiles?.forEach((profile: any) => {
        const escapeCsv = (value: any) => {
          if (value === null || value === undefined) return ''
          return `"${String(value).replace(/"/g, '""')}"`
        }

        csvData += `${escapeCsv(profile.recipient_email)},${profile.total_emails_sent || 0},${profile.total_emails_delivered || 0},${profile.total_emails_opened || 0},${profile.total_emails_clicked || 0},${profile.total_emails_replied || 0},${profile.total_opens || 0},${profile.total_clicks || 0},${profile.open_rate?.toFixed(2) || 0},${profile.click_rate?.toFixed(2) || 0},${profile.reply_rate?.toFixed(2) || 0},${escapeCsv(profile.first_contact_at)},${escapeCsv(profile.last_contact_at)}\n`
      })

      filename = `email-recipients-${new Date().toISOString().split('T')[0]}.csv`
    }

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

