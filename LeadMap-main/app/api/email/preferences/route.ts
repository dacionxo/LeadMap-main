import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/email/preferences
 * Get user's email marketing preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user preferences
    let { data: preferences, error } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // No preferences exist yet, return defaults
      return NextResponse.json({
        preferences: {
          has_dismissed_sample_data_banner: false,
        }
      })
    } else if (error) {
      // Check if table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.error('Table user_email_preferences does not exist. Please run the SQL schema first.')
        // Return defaults if table doesn't exist
        return NextResponse.json({
          preferences: {
            has_dismissed_sample_data_banner: false,
          }
        })
      }
      throw error
    }

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Error in GET /api/email/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/email/preferences
 * Update user's email marketing preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const updates: any = {}

    // Only allow updating specific fields
    if (typeof body.has_dismissed_sample_data_banner === 'boolean') {
      updates.has_dismissed_sample_data_banner = body.has_dismissed_sample_data_banner
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Check if preferences exist
    const { data: existing, error: checkError } = await supabase
      .from('user_email_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Check if table doesn't exist
    if (checkError && (checkError.message?.includes('does not exist') || checkError.code === '42P01')) {
      console.error('Table user_email_preferences does not exist. Please run the SQL schema first.')
      return NextResponse.json(
        { 
          error: 'Database table not found', 
          message: 'The user_email_preferences table does not exist. Please run the SQL schema in Supabase first. See supabase/email_preferences_schema.sql'
        },
        { status: 503 }
      )
    }

    let result
    if (existing && !checkError) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_email_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return NextResponse.json(
            { 
              error: 'Database table not found', 
              message: 'The user_email_preferences table does not exist. Please run the SQL schema in Supabase first. See supabase/email_preferences_schema.sql'
            },
            { status: 503 }
          )
        }
        throw error
      }
      result = data
    } else {
      // Create new preferences (checkError might be PGRST116 which means no row found)
      const { data, error } = await supabase
        .from('user_email_preferences')
        .insert([{ user_id: user.id, ...updates }])
        .select()
        .single()

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          return NextResponse.json(
            { 
              error: 'Database table not found', 
              message: 'The user_email_preferences table does not exist. Please run the SQL schema in Supabase first. See supabase/email_preferences_schema.sql'
            },
            { status: 503 }
          )
        }
        throw error
      }
      result = data
    }

    return NextResponse.json({ preferences: result })
  } catch (error: any) {
    console.error('Error in PATCH /api/email/preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

