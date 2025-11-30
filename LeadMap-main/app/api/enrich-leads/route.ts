import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * AI Skip Tracing & Data Enrichment
 * Enriches lead data with agent contact information using external APIs
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { listingIds } = await request.json()

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return NextResponse.json({ error: 'Expected array of listing IDs' }, { status: 400 })
    }

    // Fetch listings to enrich
    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .in('listing_id', listingIds)

    if (fetchError || !listings) {
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
    }

    // Enrich each listing (using mock data for now - replace with actual API)
    const enrichedListings = await Promise.all(
      listings.map(async (listing: {
        listing_id?: string
        agent_email?: string | null
        agent_phone?: string | null
        agent_name?: string | null
        street?: string | null
        unit?: string | null
        city?: string | null
        state?: string | null
        zip_code?: string | null
        [key: string]: any
      }) => {
        // In production, call actual enrichment API
        // const enriched = await callEnrichmentAPI(listing)
        
        // Mock enrichment - populate agent contact info
        const mockEnriched = {
          agent_email: listing.agent_email || `agent${Math.random().toString(36).substr(2, 9)}@example.com`,
          agent_phone: listing.agent_phone || `555-${Math.floor(Math.random() * 10000)}`.padStart(4, '0'),
          agent_name: listing.agent_name || 'Agent Name'
        }

        return {
          listing_id: listing.listing_id,
          ...mockEnriched
        }
      })
    )

    // Update listings in database
    const updates = enrichedListings.map(lead => ({
      listing_id: lead.listing_id,
      agent_email: lead.agent_email,
      agent_phone: lead.agent_phone,
      agent_name: lead.agent_name,
      updated_at: new Date().toISOString()
    }))

    const { data: updated, error: updateError } = await supabase
      .from('listings')
      .upsert(updates, {
        onConflict: 'listing_id'
      })
      .select()

    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json({ error: 'Failed to update listings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      enriched: updated?.length || 0
    })

  } catch (error) {
    console.error('Enrich leads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// TODO: Replace with actual enrichment API integration
async function callEnrichmentAPI(listing: any) {
  const apiKey = process.env.ENRICHMENT_API_KEY
  const apiUrl = process.env.ENRICHMENT_API_URL

  if (!apiKey || !apiUrl) {
    console.warn('Enrichment API not configured')
    return {}
  }

  try {
    const address = [listing.street, listing.unit, listing.city, listing.state, listing.zip_code]
      .filter(Boolean)
      .join(', ')
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: address,
        name: listing.agent_name
      })
    })

    const data = await response.json()
    
    return {
      agent_email: data.email,
      agent_phone: data.phone,
      agent_name: data.name || listing.agent_name
    }
  } catch (error) {
    console.error('Enrichment API error:', error)
    return {}
  }
}
