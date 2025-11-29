import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/lists/:listId/add
 * 
 * Adds a lead/item to a list
 * Uses optimistic conflict handling (ignores duplicates)
 * 
 * Body:
 * - itemId: string (required) - listing_id, contact.id, or company.id
 * - itemType: 'listing' | 'contact' | 'company' (required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params
    const body = await request.json()
    const { itemId, itemType } = body

    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: 'itemId and itemType are required' },
        { status: 400 }
      )
    }

    if (!['listing', 'contact', 'company'].includes(itemType)) {
      return NextResponse.json(
        { error: 'itemType must be "listing", "contact", or "company"' },
        { status: 400 }
      )
    }

    // Authenticate user - await cookies first, then pass sync function
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

    // Verify list exists and belongs to user
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, user_id, name')
      .eq('id', listId)
      .single()

    if (listError || !list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    if (list.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if item already exists
    const { data: existing } = await supabase
      .from('list_memberships')
      .select('*')
      .eq('list_id', listId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .single()

    if (existing) {
      // Item already in list - return clear error message
      return NextResponse.json({
        success: false,
        error: `This item is already in the list "${list.name}"`,
        message: `This item is already in the list "${list.name}"`,
        membership: existing,
        isNew: false,
      }, { status: 409 }) // 409 Conflict status code
    }

    // Insert new membership
    const { data: membership, error: insertError } = await supabase
      .from('list_memberships')
      .insert({
        list_id: listId,
        item_type: itemType,
        item_id: itemId,
      })
      .select()
      .single()

    // Handle duplicate key error gracefully (race condition)
    if (insertError) {
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
        // Item was added by another request - fetch and return it
        const { data: existingAfterConflict } = await supabase
          .from('list_memberships')
          .select('*')
          .eq('list_id', listId)
          .eq('item_type', itemType)
          .eq('item_id', itemId)
          .single()

        return NextResponse.json({
          success: true,
          message: 'Item already in list',
          membership: existingAfterConflict,
          isNew: false,
        })
      }

      console.error('Error adding to list:', insertError)
      return NextResponse.json(
        { error: 'Failed to add item to list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Item added to list',
      membership,
      isNew: true,
    })
  } catch (error: any) {
    console.error('API Error adding to list:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

