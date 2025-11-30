import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { setupGmailWatch, refreshGmailToken } from '@/lib/email/providers/gmail-watch'

/**
 * POST /api/mailboxes/[id]/watch
 * Set up Gmail Watch for push notifications
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mailboxId } = await params
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get mailbox
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: mailbox, error: mailboxError } = await supabaseAdmin
      .from('mailboxes')
      .select('*')
      .eq('id', mailboxId)
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json(
        { error: 'Gmail mailbox not found' },
        { status: 404 }
      )
    }

    if (!mailbox.access_token) {
      return NextResponse.json(
        { error: 'Mailbox access token is missing' },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    let accessToken = mailbox.access_token
    if (mailbox.token_expires_at && mailbox.refresh_token) {
      const expiresAt = new Date(mailbox.token_expires_at)
      const now = new Date()
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

      if (expiresAt < fiveMinutesFromNow) {
        const refreshResult = await refreshGmailToken(mailbox.refresh_token)
        if (refreshResult.success && refreshResult.accessToken) {
          accessToken = refreshResult.accessToken
          
          const expiresAt = new Date(Date.now() + (refreshResult.expiresIn || 3600) * 1000)
          await supabaseAdmin
            .from('mailboxes')
            .update({
              access_token: accessToken,
              token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', mailbox.id)
        } else {
          return NextResponse.json(
            { error: 'Failed to refresh access token' },
            { status: 401 }
          )
        }
      }
    }

    // Set up Gmail Watch
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const webhookUrl = `${baseUrl}/api/webhooks/gmail`

    const watchResult = await setupGmailWatch({
      mailboxId: mailbox.id,
      accessToken,
      refreshToken: mailbox.refresh_token || undefined,
      webhookUrl,
    })

    if (!watchResult.success) {
      return NextResponse.json(
        { error: watchResult.error || 'Failed to set up Gmail Watch' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      expiration: watchResult.expiration,
      historyId: watchResult.historyId,
      message: 'Gmail Watch set up successfully. You will receive push notifications for new emails.'
    })
  } catch (error: any) {
    console.error('Gmail Watch setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/mailboxes/[id]/watch
 * Stop Gmail Watch
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mailboxId } = await params
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get mailbox and stop watch
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: mailbox, error: mailboxError } = await supabaseAdmin
      .from('mailboxes')
      .select('*')
      .eq('id', mailboxId)
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json(
        { error: 'Gmail mailbox not found' },
        { status: 404 }
      )
    }

    // Stop watch by updating expiration (Gmail will stop sending notifications)
    await supabaseAdmin
      .from('mailboxes')
      .update({
        watch_expiration: null,
        watch_history_id: null,
      })
      .eq('id', mailbox.id)

    return NextResponse.json({
      success: true,
      message: 'Gmail Watch stopped successfully'
    })
  } catch (error: any) {
    console.error('Gmail Watch stop error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

