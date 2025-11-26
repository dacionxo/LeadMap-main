import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_supabase_service_role_key') {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      )
    }

    // Use service role key to access database
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get all tokens (we need to compare hashes)
    const { data: allTokens, error: tokensError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')

    if (tokensError || !allTokens) {
      return NextResponse.json(
        { error: 'Invalid or expired token.' },
        { status: 400 }
      )
    }

    // Find matching token by comparing hashes
    let matchedToken = null
    for (const t of allTokens) {
      try {
        const isMatch = await bcrypt.compare(token, t.token_hash)
        if (isMatch) {
          matchedToken = t
          break
        }
      } catch (compareError) {
        // Continue to next token if comparison fails
        continue
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token.' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (new Date(matchedToken.expires_at) < new Date()) {
      // Delete expired token
      await supabaseAdmin
        .from('password_reset_tokens')
        .delete()
        .eq('id', matchedToken.id)

      return NextResponse.json(
        { error: 'Token expired. Please request a new password reset.' },
        { status: 400 }
      )
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      matchedToken.user_id,
      {
        password: password,
      }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset password. Please try again.' },
        { status: 500 }
      )
    }

    // Delete used token (one-time use)
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('id', matchedToken.id)

    // Optional: Invalidate all user sessions
    // Supabase doesn't have a direct API for this, but the password change
    // will require users to log in again on their next request

    return NextResponse.json({
      message: 'Password reset successfully. You can now log in with your new password.',
      success: true,
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

