import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * POST /api/crm/deals/complete-onboarding
 * Mark deals onboarding as complete
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // For now, we'll create a placeholder deal to mark onboarding as complete
    // In the future, you might want to add a deals_onboarding_complete flag to user settings
    const { data: existingDeal } = await supabase
      .from('deals')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!existingDeal) {
      // Create a sample deal to mark onboarding as complete
      await supabase
        .from('deals')
        .insert([{
          user_id: user.id,
          title: 'Sample Deal',
          stage: 'new',
          value: 0,
          probability: 0,
        }])
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in POST /api/crm/deals/complete-onboarding:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

