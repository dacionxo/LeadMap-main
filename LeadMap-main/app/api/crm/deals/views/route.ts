import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/crm/deals/views
 * 
 * Fetches all deals views for the authenticated user
 * Supports filtering by visibility and type
 * 
 * Query params:
 * - visibility: 'restricted' | 'shared' | 'all' (default: 'all')
 * - includeSystem: boolean (include system views, default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visibility = searchParams.get('visibility') || 'all'
    const includeSystem = searchParams.get('includeSystem') !== 'false'

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

    // Build query - RLS policies handle access control
    let query = supabase
      .from('deals_views')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: false })

    // Filter by visibility
    if (visibility === 'restricted') {
      query = query.eq('visibility', 'restricted').eq('user_id', user.id)
    } else if (visibility === 'shared') {
      query = query.eq('visibility', 'shared')
    }
    // 'all' includes both restricted (user's own) and shared via RLS

    // Filter system views
    if (!includeSystem) {
      query = query.eq('is_system', false)
    }

    const { data: views, error: viewsError } = await query

    if (viewsError) {
      console.error('Error fetching deals views:', viewsError)
      return NextResponse.json(
        { error: 'Failed to fetch deals views' },
        { status: 500 }
      )
    }

    // Transform views to match component interface
    const transformedViews = (views || []).map((view) => ({
      id: view.id,
      name: view.name,
      type: view.layout === 'kanban' ? 'board' : 'table',
      isSystem: view.is_system || false,
      isStarred: view.is_starred || false,
      isShared: view.visibility === 'shared',
      isOwnedByUser: view.user_id === user.id,
      groupBy: view.group_by,
      visibleFields: view.visible_fields || [],
      filters: view.filters || {},
      visibility: view.visibility,
    }))

    return NextResponse.json({ data: transformedViews })
  } catch (error) {
    console.error('Error in GET /api/crm/deals/views:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/deals/views
 * 
 * Creates a new deals view
 * 
 * Body:
 * - name: string (required)
 * - layout: 'table' | 'kanban' (required)
 * - groupBy: string | null (optional)
 * - visibleFields: string[] (optional)
 * - filters: Record<string, any> (optional)
 * - visibility: 'restricted' | 'shared' (default: 'restricted')
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, layout, groupBy, visibleFields, filters, visibility = 'restricted' } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'View name is required' },
        { status: 400 }
      )
    }

    if (!layout || !['table', 'kanban'].includes(layout)) {
      return NextResponse.json(
        { error: 'Layout must be "table" or "kanban"' },
        { status: 400 }
      )
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

    // Check if view with same name already exists for this user
    const { data: existingView, error: checkError } = await supabase
      .from('deals_views')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking existing view:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing view' },
        { status: 500 }
      )
    }

    if (existingView) {
      return NextResponse.json(
        { error: 'A view with this name already exists' },
        { status: 409 }
      )
    }

    // Insert new view
    const { data: newView, error: insertError } = await supabase
      .from('deals_views')
      .insert({
        user_id: user.id,
        name: name.trim(),
        layout,
        group_by: groupBy || null,
        visible_fields: visibleFields || [],
        filters: filters || {},
        visibility,
        is_system: false,
        is_starred: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating deals view:', insertError)
      return NextResponse.json(
        { error: 'Failed to create deals view' },
        { status: 500 }
      )
    }

    // Transform view to match component interface
    const transformedView = {
      id: newView.id,
      name: newView.name,
      type: newView.layout === 'kanban' ? 'board' : 'table',
      isSystem: newView.is_system || false,
      isStarred: newView.is_starred || false,
      isShared: newView.visibility === 'shared',
      isOwnedByUser: true,
      groupBy: newView.group_by,
      visibleFields: newView.visible_fields || [],
      filters: newView.filters || {},
      visibility: newView.visibility,
    }

    return NextResponse.json({ data: transformedView }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/crm/deals/views:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

