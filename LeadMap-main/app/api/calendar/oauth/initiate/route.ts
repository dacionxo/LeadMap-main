import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

/**
 * POST /api/calendar/oauth/initiate
 * Initiate OAuth flow based on email domain
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Detect calendar provider from email domain
    const emailDomain = email.toLowerCase().split('@')[1] || ''
    let provider: 'google' | 'microsoft365' | 'outlook' | 'exchange' | null = null
    let authUrl: string | null = null

    // Google Calendar detection
    if (emailDomain.includes('gmail.com') || emailDomain.includes('google.com') || emailDomain.includes('googlemail.com')) {
      provider = 'google'
      const clientId = process.env.GOOGLE_CLIENT_ID
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/oauth/google/callback`
      
      if (!clientId) {
        return NextResponse.json(
          { error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID in environment variables.' },
          { status: 500 }
        )
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' ')

      const state = Buffer.from(JSON.stringify({ userId: user.id, email, provider: 'google' })).toString('base64')
      
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      googleAuthUrl.searchParams.set('client_id', clientId)
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
      googleAuthUrl.searchParams.set('response_type', 'code')
      googleAuthUrl.searchParams.set('scope', scopes)
      googleAuthUrl.searchParams.set('access_type', 'offline')
      googleAuthUrl.searchParams.set('prompt', 'consent')
      googleAuthUrl.searchParams.set('state', state)
      googleAuthUrl.searchParams.set('login_hint', email) // Pre-fill email

      authUrl = googleAuthUrl.toString()
    }
    // Microsoft 365 / Outlook detection
    else if (
      emailDomain.includes('outlook.com') || 
      emailDomain.includes('hotmail.com') || 
      emailDomain.includes('live.com') ||
      emailDomain.includes('msn.com') ||
      emailDomain.includes('microsoft.com') ||
      emailDomain.includes('office365.com') ||
      emailDomain.includes('onmicrosoft.com')
    ) {
      // Determine if it's Outlook.com (personal) or Microsoft 365 (business)
      if (emailDomain.includes('outlook.com') || emailDomain.includes('hotmail.com') || emailDomain.includes('live.com') || emailDomain.includes('msn.com')) {
        provider = 'outlook'
      } else {
        provider = 'microsoft365'
      }

      const clientId = process.env.MICROSOFT_CLIENT_ID
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/oauth/microsoft/callback`
      
      if (!clientId) {
        return NextResponse.json(
          { error: 'Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID in environment variables.' },
          { status: 500 }
        )
      }

      const scopes = [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
      ].join(' ')

      const state = Buffer.from(JSON.stringify({ userId: user.id, email, provider })).toString('base64')
      
      const microsoftAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
      microsoftAuthUrl.searchParams.set('client_id', clientId)
      microsoftAuthUrl.searchParams.set('redirect_uri', redirectUri)
      microsoftAuthUrl.searchParams.set('response_type', 'code')
      microsoftAuthUrl.searchParams.set('scope', scopes)
      microsoftAuthUrl.searchParams.set('state', state)
      microsoftAuthUrl.searchParams.set('response_mode', 'query')
      microsoftAuthUrl.searchParams.set('login_hint', email) // Pre-fill email

      authUrl = microsoftAuthUrl.toString()
    }
    // Exchange Server (generic email domain - assume Exchange)
    else {
      provider = 'exchange'
      return NextResponse.json(
        { 
          error: 'Exchange Server integration requires manual configuration. Please contact support or use Microsoft 365/Outlook for automatic integration.',
          provider: 'exchange',
          email 
        },
        { status: 400 }
      )
    }

    if (!authUrl || !provider) {
      return NextResponse.json(
        { error: 'Unable to determine calendar provider from email domain' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      authUrl,
      provider,
      email 
    })
  } catch (error: any) {
    console.error('Error in POST /api/calendar/oauth/initiate:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

