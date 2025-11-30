import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Pause Campaign
 * POST /api/campaigns/[id]/pause
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

    // Verify campaign belongs to user and can be paused
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!['scheduled', 'running'].includes(campaign.status)) {
      return NextResponse.json({
        error: `Cannot pause campaign with status: ${campaign.status}`
      }, { status: 400 })
    }

    // Update status to paused
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Campaign pause error:', updateError)
      return NextResponse.json({ error: 'Failed to pause campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: updatedCampaign })
  } catch (error) {
    console.error('Campaign pause error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

