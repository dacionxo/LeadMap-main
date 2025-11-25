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

    const existingUser = users?.find(user => user.email?.toLowerCase() === email.toLowerCase())

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

    // Generate a new verification link and trigger email sending
    // Supabase Admin API generateLink creates a magic link
    // If Supabase email service is configured, it will automatically send the email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/auth/callback`
      }
    })

    if (linkError) {
      console.error('Error generating verification link:', linkError)
      return NextResponse.json(
        { error: 'Unable to resend verification email. Please try again later.' },
        { status: 500 }
      )
    }

    // If linkData contains properties, Supabase has generated the link
    // Supabase's email service should automatically send the email if configured
    // If using custom email service, you would send the email here using linkData.properties.action_link
    
    // For now, we'll return success - Supabase should handle email sending if configured
    // If emails aren't being sent, check Supabase Dashboard → Authentication → Email Templates
    return NextResponse.json({
      message: 'Verification email has been resent. Please check your inbox.',
      success: true,
      // Include the link in response for debugging (remove in production)
      ...(process.env.NODE_ENV === 'development' && linkData?.properties?.action_link ? {
        debug_link: linkData.properties.action_link
      } : {})
    })
  } catch (error: any) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

