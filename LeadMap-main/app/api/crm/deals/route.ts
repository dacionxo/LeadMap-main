import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/crm/deals
 * Fetch deals with filtering, sorting, and pagination
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - search: Search query
 * - stage: Filter by stage
 * - pipeline: Filter by pipeline ID
 * - owner: Filter by owner ID
 * - assignedTo: Filter by assigned user ID
 * - sortBy: Field to sort by (default: 'created_at')
 * - sortOrder: 'asc' or 'desc' (default: 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const search = searchParams.get('search') || ''
    const stage = searchParams.get('stage') || null
    const pipelineId = searchParams.get('pipeline') || null
    const ownerId = searchParams.get('owner') || null
    const assignedTo = searchParams.get('assignedTo') || null
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Authenticate user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role for queries
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

    // Calculate pagination
    const offset = (page - 1) * pageSize
    const limit = pageSize

    // Build query with joins for contact and owner info
    let query = supabase
      .from('deals')
      .select(`
        *,
        contact:contacts(id, first_name, last_name, email, phone),
        owner:owner_id(id, email),
        assigned_user:assigned_to(id, email)
      `, { count: 'exact' })
      .eq('user_id', user.id)

    // Apply filters
    if (stage) {
      query = query.eq('stage', stage)
    }
    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId)
    }
    if (ownerId) {
      query = query.eq('owner_id', ownerId)
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    // Apply search
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: deals, error, count } = await query

    if (error) {
      console.error('Error fetching deals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch deals', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: deals || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/crm/deals:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/deals
 * Create a new deal
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

    const body = await request.json()
    const {
      title,
      description,
      value,
      stage = 'new',
      probability = 0,
      expected_close_date,
      contact_id,
      listing_id,
      pipeline_id,
      owner_id,
      assigned_to,
      source,
      source_id,
      notes,
      tags = [],
      contact_ids = [], // Array of contact IDs for deal_contacts
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Create the deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert([{
        user_id: user.id,
        title,
        description,
        value: value ? parseFloat(value) : null,
        stage,
        probability: probability ? parseInt(probability) : 0,
        expected_close_date: expected_close_date || null,
        contact_id: contact_id || null,
        listing_id: listing_id || null,
        pipeline_id: pipeline_id || null,
        owner_id: owner_id || user.id, // Default to current user
        assigned_to: assigned_to || null,
        source: source || null,
        source_id: source_id || null,
        notes: notes || null,
        tags: tags || [],
      }])
      .select()
      .single()

    if (dealError || !deal) {
      console.error('Error creating deal:', dealError)
      return NextResponse.json(
        { error: 'Failed to create deal', details: dealError?.message },
        { status: 500 }
      )
    }

    // Add multiple contacts if provided
    if (contact_ids && contact_ids.length > 0) {
      const dealContacts = contact_ids.map((cid: string) => ({
        deal_id: deal.id,
        contact_id: cid,
      }))

      await supabase
        .from('deal_contacts')
        .insert(dealContacts)
    }

    // Create activity log entry
    await supabase
      .from('deal_activities')
      .insert([{
        deal_id: deal.id,
        user_id: user.id,
        activity_type: 'note',
        title: 'Deal created',
        description: `Deal "${title}" was created`,
      }])

    return NextResponse.json({ data: deal }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/crm/deals:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

