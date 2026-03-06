import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { getPrimaryCalendarInfo } from '@/lib/calendar-import'

export const runtime = 'nodejs'

/**
 * GET /api/calendar/oauth/google/callback
 * Handle Google Calendar OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=missing_params`
      )
    }

    // Decode state to get user ID (state may come from initiate with email or from direct Google OAuth with just userId)
    let userId: string
    let stateEmail: string | undefined
    let provider: string | undefined
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
      userId = decoded.userId
      stateEmail = decoded.email
      provider = decoded.provider ?? 'google'
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=invalid_state`
      )
    }

    // Verify user
    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({
      cookies: () => cookieStore,
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=unauthorized`
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    // Normalize URL to avoid double slashes
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const redirectUri = `${baseUrl}/api/calendar/oauth/google/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=not_configured`
      )
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    // Get user info and calendar info (use OpenID endpoint to avoid 307 redirects)
    const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=user_info_failed`
      )
    }

    const userInfo = await userInfoResponse.json()
    const userEmail = userInfo.email || stateEmail

    // Get primary calendar via CalendarList.list (cal-sync style); fallback to "primary" + email if list fails
    const { calendarId, calendarName } = await getPrimaryCalendarInfo(access_token, userEmail)

    // Save connection to database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=db_error`
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const tokenExpiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Check if connection exists
    const { data: existing } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('email', userEmail)
      .single()

    // Google OpenID userinfo returns "sub" (subject), not "id" - required by calendar_connections.provider_account_id NOT NULL
    const providerAccountId = userInfo.sub ?? userInfo.id ?? ''
    if (!providerAccountId) {
      console.error('Google userinfo missing sub/id:', userInfo)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=user_info_incomplete`
      )
    }

    const connectionData = {
      user_id: user.id,
      provider: 'google',
      provider_account_id: providerAccountId,
      email: userEmail,
      access_token: access_token,
      refresh_token: refresh_token || null,
      token_expires_at: tokenExpiresAt,
      calendar_id: calendarId,
      calendar_name: calendarName,
      sync_enabled: true,
      last_sync_at: new Date().toISOString(),
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('calendar_connections')
        .update(connectionData)
        .eq('id', existing.id)
      if (updateError) {
        console.error('Calendar connection update failed:', updateError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=db_error`
        )
      }
    } else {
      const { error: insertError } = await supabase
        .from('calendar_connections')
        .insert([connectionData])
      if (insertError) {
        console.error('Calendar connection insert failed:', insertError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=db_error`
        )
      }
    }

    // Update user calendar settings: mark onboarding complete and set calendar type
    const { data: settings } = await supabase
      .from('user_calendar_settings')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const calendarType = 'google' // This is the Google OAuth callback
    const settingsUpdate = {
      calendar_onboarding_complete: true,
      calendar_type: calendarType,
    }

    if (settings) {
      await supabase
        .from('user_calendar_settings')
        .update(settingsUpdate)
        .eq('id', settings.id)
    } else {
      await supabase
        .from('user_calendar_settings')
        .insert([{
          user_id: user.id,
          ...settingsUpdate,
        }])
    }

    // Get the connection ID (either existing or newly created)
    const { data: savedConnection } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('email', userEmail)
      .single()

    // Sync existing events from Google Calendar into user's calendar (Supabase calendar_events)
    // We await the initial sync so events appear in the user calendar before redirect (world-class UX)
    if (savedConnection?.id && access_token) {
      const syncUrl = `${baseUrl}/api/calendar/sync/google`
      const syncBody = JSON.stringify({
        userId: user.id,
        connectionId: savedConnection.id,
        accessToken: access_token,
        calendarId: calendarId,
      })
      const syncTimeoutMs = 90_000 // 90s max so serverless doesn't kill the request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), syncTimeoutMs)
      try {
        const syncRes = await fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: syncBody,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!syncRes.ok) {
          const errText = await syncRes.text()
          console.error('Google Calendar initial sync failed:', syncRes.status, errText)
        }
      } catch (syncErr: any) {
        clearTimeout(timeoutId)
        if (syncErr?.name === 'AbortError') {
          console.warn('Google Calendar initial sync timed out; user can sync manually on calendar page.')
        } else {
          console.error('Error during Google Calendar initial sync:', syncErr)
        }
        // Don't block redirect; calendar page will trigger manual sync as fallback
      }
    }

    // Redirect to calendar page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_connected=google`
    )
  } catch (error) {
    console.error('Error in Google OAuth callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/crm/calendar?calendar_error=internal_error`
    )
  }
}

