import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Geo API Leads
 * Fetches real estate related places from Google Places API
 * and creates listings
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lat, lng, radius_km, placeType = 'real_estate_agency' } = await request.json()

    if (!lat || !lng || !radius_km) {
      return NextResponse.json({ error: 'lat, lng, and radius_km are required' }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 })
    }

    // Convert radius to meters
    const radius_meters = radius_km * 1000

    // Call Google Places API
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius_meters}&type=${placeType}&key=${apiKey}`
    
    const placesResponse = await fetch(placesUrl)
    const placesData = await placesResponse.json()

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', placesData)
      return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 })
    }

    // Transform and insert results
    const listings = placesData.results.map((place: any, index: number) => {
      const listingId = `geo-${place.place_id || `place-${Date.now()}-${index}`}`
      const vicinity = place.vicinity || ''
      const city = extractCityFromVicinity(vicinity)
      
      return {
        listing_id: listingId,
        property_url: place.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        street: vicinity.split(',')[0] || '',
        city: city || '',
        state: '', // Will need to be enriched
        zip_code: '',
        listing_source_name: 'GooglePlaces',
        listing_source_id: place.place_id || '',
        active: true,
        other: {
          place_id: place.place_id,
          name: place.name,
          rating: place.rating,
          types: place.types
        }
      }
    })

    // Insert into database
    const { data, error } = await supabase
      .from('listings')
      .upsert(listings, {
        onConflict: 'listing_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to insert geo leads', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      total: listings.length
    })

  } catch (error) {
    console.error('Geo leads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractCityFromVicinity(vicinity: string): string {
  if (!vicinity) return ''
  const parts = vicinity.split(',')
  return parts[parts.length - 2]?.trim() || ''
}
