import { NextRequest, NextResponse } from 'next/server'
import { getRouteHandlerClient, getServiceRoleClient } from '@/lib/supabase-singleton'

const AVATAR_BUCKET = 'avatars'
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Use form field "file".' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File must be 2MB or smaller' },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be JPEG, PNG, GIF, or WebP' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const supabaseAdmin = getServiceRoleClient()

    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    if (!buckets?.some((b) => b.name === AVATAR_BUCKET)) {
      await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_TYPES,
      })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed', details: uploadError.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path)
    const avatarUrl = urlData.publicUrl

    const { data: profile, error: updateError } = await (supabaseAdmin
      .from('users') as any)
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile avatar_url update error:', updateError)
      return NextResponse.json(
        { error: 'Profile update failed', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ avatar_url: avatarUrl, profile })
  } catch (err: unknown) {
    console.error('Avatar POST error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getServiceRoleClient()
    const { data: profileRow } = await (supabaseAdmin
      .from('users') as any)
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    const { error: updateError } = await (supabaseAdmin
      .from('users') as any)
      .update({ avatar_url: null })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile avatar_url clear error:', updateError)
      return NextResponse.json(
        { error: 'Failed to clear avatar' },
        { status: 500 }
      )
    }

    if (profileRow?.avatar_url) {
      const pathMatch = profileRow.avatar_url.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/)
      if (pathMatch?.[1]) {
        await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([decodeURIComponent(pathMatch[1])])
      }
    }

    const { data: profile } = await (supabaseAdmin
      .from('users') as any)
      .select()
      .eq('id', user.id)
      .single()

    return NextResponse.json({ avatar_url: null, profile })
  } catch (err: unknown) {
    console.error('Avatar DELETE error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
