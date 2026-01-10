import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import {
  getUserWorkspaces,
  createWorkspace,
  getUserPrimaryWorkspace,
  createDefaultWorkspaceForUser,
} from '@/lib/postiz/workspaces'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/postiz/workspaces
 * Get all workspaces for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaces = await getUserWorkspaces(user.id)

    return NextResponse.json({ workspaces })
  } catch (error: any) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/postiz/workspaces
 * Create a new workspace
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      )
    }

    const workspace = await createWorkspace(name.trim(), user.id, description)

    if (!workspace) {
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      )
    }

    return NextResponse.json({ workspace }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace', details: error.message },
      { status: 500 }
    )
  }
}
