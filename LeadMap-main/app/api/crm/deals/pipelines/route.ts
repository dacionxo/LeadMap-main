import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * GET /api/crm/deals/pipelines
 * Get all pipelines for the user
 */
export async function GET(request: NextRequest) {
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

    const { data: pipelines, error } = await supabase
      .from('deal_pipelines')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pipelines:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pipelines', details: error.message },
        { status: 500 }
      )
    }

    // If no pipelines exist, create a default one
    if (!pipelines || pipelines.length === 0) {
      const defaultStages = ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Under Contract', 'Closed Won', 'Closed Lost']
      
      const { data: defaultPipeline, error: createError } = await supabase
        .from('deal_pipelines')
        .insert([{
          user_id: user.id,
          name: 'Default Pipeline',
          description: 'Default sales pipeline',
          stages: defaultStages,
          is_default: true,
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating default pipeline:', createError)
      }

      return NextResponse.json({
        data: defaultPipeline ? [defaultPipeline] : [],
      })
    }

    return NextResponse.json({ data: pipelines || [] })
  } catch (error: any) {
    console.error('Error in GET /api/crm/deals/pipelines:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/deals/pipelines
 * Create a new pipeline
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
    const { name, description, stages, is_default } = body

    if (!name || !stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json(
        { error: 'name and stages (array) are required' },
        { status: 400 }
      )
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await supabase
        .from('deal_pipelines')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
    }

    const { data: pipeline, error } = await supabase
      .from('deal_pipelines')
      .insert([{
        user_id: user.id,
        name,
        description: description || null,
        stages,
        is_default: is_default || false,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating pipeline:', error)
      return NextResponse.json(
        { error: 'Failed to create pipeline', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: pipeline }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/crm/deals/pipelines:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

