import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { checkMailboxHealth } from '@/lib/email/health-check'

/**
 * Mailbox Health Check API
 * GET /api/mailboxes/[id]/health - Check mailbox connection health
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mailboxId } = await params

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get mailbox (ensure user owns it)
    const { data: mailbox, error: mailboxError } = await supabaseAdmin
      .from('mailboxes')
      .select('*')
      .eq('id', mailboxId)
      .eq('user_id', user.id)
      .single()

    if (mailboxError || !mailbox) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 })
    }

    // Perform health check
    const healthResult = await checkMailboxHealth(mailbox, supabaseAdmin)

    // Update health check record
    await supabaseAdmin
      .from('mailbox_health_checks')
      .upsert({
        mailbox_id: mailboxId,
        healthy: healthResult.healthy,
        status: healthResult.status,
        last_checked_at: new Date().toISOString(),
        last_successful_check_at: healthResult.healthy ? new Date().toISOString() : null,
        error_message: healthResult.error || null,
        provider_response_time_ms: healthResult.responseTime,
        token_valid: healthResult.tokenValid,
        smtp_connection_valid: healthResult.smtpValid,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'mailbox_id'
      })

    return NextResponse.json({
      healthy: healthResult.healthy,
      status: healthResult.status,
      last_checked: new Date().toISOString(),
      error: healthResult.error,
      details: {
        response_time_ms: healthResult.responseTime,
        token_valid: healthResult.tokenValid,
        smtp_valid: healthResult.smtpValid
      }
    })
  } catch (error: any) {
    console.error('Mailbox health check error:', error)
    return NextResponse.json({
      healthy: false,
      status: 'unhealthy',
      error: error.message || 'Health check failed'
    }, { status: 500 })
  }
}

