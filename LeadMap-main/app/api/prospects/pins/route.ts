import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

type PinsResponse = {
  pins: {
    pinnedFilters: string[]
  }
}

const DEFAULT_PINNED_FILTERS: string[] = [
  'price_range',
  'location',
  'ai_score',
  'status',
  'beds',
  'baths',
  'sqft',
  'year_built'
]

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore
    })

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_prospect_filter_pins')
      .select('pinned_filters')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // PGRST116 = no rows found, 42P01 / "does not exist" = table missing
      if (error.code === 'PGRST116') {
        const body: PinsResponse = {
          pins: { pinnedFilters: DEFAULT_PINNED_FILTERS }
        }
        return NextResponse.json(body)
      }
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.error(
          'Table user_prospect_filter_pins does not exist. Please run supabase/migrations/add_prospect_pinned_filters_schema.sql'
        )
        const body: PinsResponse = {
          pins: { pinnedFilters: DEFAULT_PINNED_FILTERS }
        }
        return NextResponse.json(body)
      }
      throw error
    }

    const pinned = Array.isArray(data?.pinned_filters)
      ? (data!.pinned_filters as string[])
      : DEFAULT_PINNED_FILTERS

    const body: PinsResponse = {
      pins: { pinnedFilters: pinned }
    }

    return NextResponse.json(body)
  } catch (error: any) {
    console.error('Error in GET /api/prospects/pins:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore
    })

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const raw = body?.pinnedFilters

    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: 'pinnedFilters must be an array of strings' },
        { status: 400 }
      )
    }

    const pinnedFilters = raw
      .map((v: any) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v: string) => v.length > 0)

    // If empty, we still persist an empty array so the user can intentionally clear pins
    const { data: existing, error: checkError } = await supabase
      .from('user_prospect_filter_pins')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (checkError && (checkError.message?.includes('does not exist') || checkError.code === '42P01')) {
      console.error(
        'Table user_prospect_filter_pins does not exist. Please run supabase/migrations/add_prospect_pinned_filters_schema.sql'
      )
      return NextResponse.json(
        {
          error: 'Database table not found',
          message:
            'The user_prospect_filter_pins table does not exist. Please run the SQL schema in Supabase first. See supabase/migrations/add_prospect_pinned_filters_schema.sql'
        },
        { status: 503 }
      )
    }

    let result

    if (existing && !checkError) {
      const { data, error } = await supabase
        .from('user_prospect_filter_pins')
        .update({ pinned_filters: pinnedFilters })
        .eq('user_id', user.id)
        .select('pinned_filters')
        .single()

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return NextResponse.json(
            {
              error: 'Database table not found',
              message:
                'The user_prospect_filter_pins table does not exist. Please run the SQL schema in Supabase first. See supabase/migrations/add_prospect_pinned_filters_schema.sql'
            },
            { status: 503 }
          )
        }
        throw error
      }
      result = data
    } else {
      const { data, error } = await supabase
        .from('user_prospect_filter_pins')
        .insert([{ user_id: user.id, pinned_filters: pinnedFilters }])
        .select('pinned_filters')
        .single()

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return NextResponse.json(
            {
              error: 'Database table not found',
              message:
                'The user_prospect_filter_pins table does not exist. Please run the SQL schema in Supabase first. See supabase/migrations/add_prospect_pinned_filters_schema.sql'
            },
            { status: 503 }
          )
        }
        throw error
      }
      result = data
    }

    const responseBody: PinsResponse = {
      pins: { pinnedFilters: (result.pinned_filters as string[]) ?? [] }
    }

    return NextResponse.json(responseBody)
  } catch (error: any) {
    console.error('Error in PATCH /api/prospects/pins:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

