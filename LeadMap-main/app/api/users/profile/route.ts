import { NextRequest, NextResponse } from 'next/server'
import { getRouteHandlerClient, getServiceRoleClient } from '@/lib/supabase-singleton'

const BIO_MAX_LENGTH = 275

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      first_name,
      last_name,
      email,
      phone,
      job_title,
      bio,
    } = body

    if (bio !== undefined && typeof bio === 'string' && bio.length > BIO_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Bio must be at most ${BIO_MAX_LENGTH} characters` },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}
    if (first_name !== undefined) updates.first_name = first_name ?? null
    if (last_name !== undefined) updates.last_name = last_name ?? null
    if (email !== undefined) updates.email = email ?? ''
    if (phone !== undefined) updates.phone = phone ?? null
    if (job_title !== undefined) updates.job_title = job_title ?? null
    if (bio !== undefined) updates.bio = bio ?? null

    const firstName = (updates.first_name as string) ?? ''
    const lastName = (updates.last_name as string) ?? ''
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    if (fullName) updates.name = fullName

    const supabaseAdmin = getServiceRoleClient()
    const { data: profile, error } = await (supabaseAdmin
      .from('users') as any)
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: 'Failed to update profile', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (err: unknown) {
    console.error('Profile PATCH error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
