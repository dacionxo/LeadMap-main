import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Resume Campaign
 * POST /api/campaigns/[id]/resume
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

    // Verify campaign belongs to user and can be resumed
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'paused') {
      return NextResponse.json({
        error: `Cannot resume campaign with status: ${campaign.status}`
      }, { status: 400 })
    }

    // Update status to running
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'running' })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Campaign resume error:', updateError)
      return NextResponse.json({ error: 'Failed to resume campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: updatedCampaign })
  } catch (error) {
    console.error('Campaign resume error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

