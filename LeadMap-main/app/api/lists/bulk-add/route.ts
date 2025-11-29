import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/lists/bulk-add
 * 
 * Apollo-grade bulk add operation
 * Adds multiple items to multiple lists in a single transaction
 * 
 * Body:
 * - listIds: string[] (required) - Array of list IDs
 * - items: Array<{ itemId: string, itemType: 'listing' | 'contact' | 'company' }> (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listIds, items } = body

    if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
      return NextResponse.json(
        { error: 'listIds array is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
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

    // Verify all lists exist and belong to user
    const { data: lists, error: listsError } = await supabase
      .from('lists')
      .select('id, user_id')
      .in('id', listIds)
      .eq('user_id', user.id)

    if (listsError || !lists || lists.length !== listIds.length) {
      return NextResponse.json(
        { error: 'One or more lists not found or unauthorized' },
        { status: 404 }
      )
    }

    // Build bulk insert array and check for duplicates first
    const memberships = []
    const duplicateInfo: Array<{ listId: string; itemId: string; listName: string }> = []
    
    // Get list names for better error messages
    const listNamesMap = new Map(lists.map(l => [l.id, l.name || 'Unknown']))
    
    for (const listId of listIds) {
      for (const item of items) {
        if (!item.itemId || !item.itemType) continue
        if (!['listing', 'contact', 'company'].includes(item.itemType)) continue

        // Check if this membership already exists
        const { data: existing } = await supabase
          .from('list_memberships')
          .select('id')
          .eq('list_id', listId)
          .eq('item_type', item.itemType)
          .eq('item_id', item.itemId)
          .single()

        if (existing) {
          // Track duplicate for reporting
          duplicateInfo.push({
            listId,
            itemId: item.itemId,
            listName: listNamesMap.get(listId) || 'Unknown'
          })
        } else {
          // Only add if it doesn't exist
        memberships.push({
          list_id: listId,
          item_type: item.itemType,
          item_id: item.itemId,
        })
        }
      }
    }

    if (memberships.length === 0) {
      // All items were duplicates
      return NextResponse.json({
        success: false,
        error: 'All items are already in the selected list(s)',
        duplicates: duplicateInfo.length,
        total: items.length * listIds.length,
        duplicateDetails: duplicateInfo,
      }, { status: 400 })
    }

    // Insert only new memberships
    const { data: inserted, error: insertError } = await supabase
      .from('list_memberships')
      .insert(memberships)
      .select()

    if (insertError) {
      console.error('Error bulk adding:', insertError)
      return NextResponse.json(
        { error: 'Failed to add items to lists', details: insertError.message },
        { status: 500 }
      )
    }

    const addedCount = inserted?.length || 0
    const duplicateCount = duplicateInfo.length

    // Build response message
    let message = `Successfully added ${addedCount} item(s) to ${listIds.length} list(s)`
    if (duplicateCount > 0) {
      message += `. ${duplicateCount} item(s) were already in the list(s)`
    }

    return NextResponse.json({
      success: true,
      message,
      added: addedCount,
      duplicates: duplicateCount,
      total: items.length * listIds.length,
      duplicateDetails: duplicateInfo.length > 0 ? duplicateInfo : undefined,
    })
  } catch (error: any) {
    console.error('API Error bulk adding:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

