import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

const LISTING_TABLES = [
  'listings',
  'expired_listings',
  'fsbo_leads',
  'frbo_leads',
  'imports',
  'foreclosure_listings',
] as const

/**
 * GET /api/crm/deals/listing?listingId=xxx
 * Fetches a single listing by listing_id from any of the property tables.
 * Used to open the property details modal from the deals page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listingId')
    if (!listingId || listingId.trim() === '') {
      return NextResponse.json(
        { error: 'listingId is required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    for (const tableName of LISTING_TABLES) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('listing_id', listingId)
          .maybeSingle()

        if (!error && data) {
          return NextResponse.json({ data })
        }
        // If table doesn't exist or column error, skip
        if (error && (error.code === 'PGRST116' || error.code === '42P01')) continue
      } catch {
        continue
      }
    }

    return NextResponse.json({ data: null }, { status: 200 })
  } catch (err) {
    console.error('Error fetching listing for deal:', err)
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 }
    )
  }
}
