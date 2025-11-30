import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Cancel Campaign
 * POST /api/campaigns/[id]/cancel
 */

export async function POST(
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

    // Verify campaign belongs to user and can be cancelled
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (['completed', 'cancelled'].includes(campaign.status)) {
      return NextResponse.json({
        error: `Cannot cancel campaign with status: ${campaign.status}`
      }, { status: 400 })
    }

    // Update campaign status to cancelled
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Campaign cancel error:', updateError)
      return NextResponse.json({ error: 'Failed to cancel campaign' }, { status: 500 })
    }

    // Cancel all queued/pending emails for this campaign
    await supabase
      .from('emails')
      .update({ status: 'cancelled' })
      .eq('campaign_id', id)
      .in('status', ['queued', 'sending'])

    // Update recipient statuses
    await supabase
      .from('campaign_recipients')
      .update({ status: 'pending' })
      .eq('campaign_id', id)
      .in('status', ['queued', 'in_progress'])

    return NextResponse.json({ campaign: updatedCampaign })
  } catch (error) {
    console.error('Campaign cancel error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

