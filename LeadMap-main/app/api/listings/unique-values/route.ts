import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Whitelist of fsbo_leads columns allowed for distinct-value queries (matches Supabase RPC). */
const FSBO_DISTINCT_COLUMNS = [
  'living_area', 'year_built_pagination', 'bedrooms', 'bathrooms',
  'property_type', 'construction_type', 'building_style', 'effective_year_built',
  'number_of_units', 'stories', 'garage', 'heating_type', 'heating_gas',
  'air_conditioning', 'basement', 'deck', 'interior_walls', 'exterior_walls',
  'fireplaces', 'flooring_cover', 'driveway', 'pool', 'patio', 'porch',
  'roof', 'sewer', 'water', 'apn', 'lot_size', 'legal_name', 'legal_description',
  'property_class', 'county_name', 'elementary_school_district', 'high_school_district',
  'zoning', 'flood_zone', 'tax_year', 'tax_amount', 'assessment_year',
  'total_assessed_value', 'assessed_improvement_value', 'total_market_value', 'amenities'
] as const

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table') || ''
  const columnsParam = searchParams.get('columns') || ''

  if (table !== 'fsbo_leads') {
    return NextResponse.json({ data: {} })
  }

  const requestedColumns = columnsParam
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter((c) => FSBO_DISTINCT_COLUMNS.includes(c as any))
  const columnsToFetch = requestedColumns.length > 0
    ? requestedColumns
    : [...FSBO_DISTINCT_COLUMNS]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ data: {}, error: 'Missing Supabase configuration' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const data: Record<string, string[]> = {}

  for (const col of columnsToFetch) {
    const { data: values, error } = await supabase.rpc('get_fsbo_leads_distinct', {
      p_column_name: col
    })
    if (error) {
      console.warn(`get_fsbo_leads_distinct(${col}):`, error.message)
      data[col] = []
    } else {
      data[col] = Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : []
    }
  }

  return NextResponse.json({ data })
}
