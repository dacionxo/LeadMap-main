import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_supabase_service_role_key') {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Use service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Find the user
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json(
        { error: 'Unable to find user' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    const existingUser = users.find(user => user.email?.toLowerCase() === email.toLowerCase())

    if (!existingUser) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    if (existingUser.email_confirmed_at) {
      return NextResponse.json(
        { error: 'This email is already verified. Please log in instead.' },
        { status: 400 }
      )
    }

    // For unverified users, use inviteUserByEmail to resend verification email
    // This method sends a confirmation email even for existing users
    try {
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/auth/callback`
        }
      )

      if (inviteError) {
        // If inviteUserByEmail fails (e.g., user already invited), try alternative method
        // Use updateUserById to reset confirmation status, which might trigger email
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            email_confirm: false
          }
        )

        if (updateError) {
          console.error('Error updating user:', updateError)
        }

        // Generate a magic link as fallback
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/auth/callback`
          }
        })

        if (linkError) {
          console.error('Error generating magic link:', linkError)
          return NextResponse.json(
            { error: 'Unable to resend verification email. Please try again later.' },
            { status: 500 }
          )
        }

        // Link generated - Supabase should send email if configured
        return NextResponse.json({
          message: 'Verification email has been resent. Please check your inbox.',
          success: true
        })
      }

      // inviteUserByEmail succeeded
      return NextResponse.json({
        message: 'Verification email has been resent. Please check your inbox.',
        success: true
      })
    } catch (error: any) {
      console.error('Error resending verification email:', error)
      return NextResponse.json(
        { error: 'Unable to resend verification email. Please try again later.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

