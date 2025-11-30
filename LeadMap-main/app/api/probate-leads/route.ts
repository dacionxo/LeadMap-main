import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Probate Leads API
 * GET: List probate leads
 * POST: Upload probate leads (CSV or JSON, admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const state = searchParams.get('state')

    let query = supabase
      .from('probate_leads')
      .select('*')
      .order('filing_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (state) {
      query = query.eq('state', state)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch probate leads' }, { status: 500 })
    }

    return NextResponse.json({ leads: data || [], count: data?.length || 0 })
  } catch (error) {
    console.error('Probate leads error:', error)
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

    // Check admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response('Unauthorized', { status: 403 })
    }

    const { leads } = await request.json()

    if (!Array.isArray(leads)) {
      return NextResponse.json({ error: 'Expected array of leads' }, { status: 400 })
    }

    // Validate and transform
    const validLeads = leads.filter(lead => 
      lead.case_number && lead.decedent_name && lead.address && lead.city && lead.state && lead.zip
    )

    if (validLeads.length === 0) {
      return NextResponse.json({ error: 'No valid probate leads' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('probate_leads')
      .upsert(validLeads, {
        onConflict: 'case_number',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to insert probate leads' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      received: leads.length,
      valid: validLeads.length
    })
  } catch (error) {
    console.error('Create probate leads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

