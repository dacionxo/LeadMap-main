import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Get Expired Leads
 * Returns listings that have expired status
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const source = searchParams.get('source')

    // Build query - filter by status containing "expired", "sold", or "off market"
    let query = supabase
      .from('listings')
      .select('*')
      .or('status.ilike.%expired%,status.ilike.%sold%,status.ilike.%off market%')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (source) {
      query = query.eq('listing_source_name', source)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch expired leads' }, { status: 500 })
    }

    return NextResponse.json({
      leads: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Expired leads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
