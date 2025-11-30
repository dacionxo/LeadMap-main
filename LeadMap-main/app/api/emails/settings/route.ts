import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Email Settings API
 * GET /api/emails/settings - Get email settings (user-specific or global)
 * PUT /api/emails/settings - Update email settings
 */

export async function GET(request: NextRequest) {
  try {
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

    // Get user-specific settings, or fall back to global (user_id = NULL)
    const { data: userSettings } = await supabaseAdmin
      .from('email_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: globalSettings } = await supabaseAdmin
      .from('email_settings')
      .select('*')
      .is('user_id', null)
      .single()

    // Merge user settings with global defaults
    const settings = {
      from_name: userSettings?.from_name || globalSettings?.from_name || process.env.EMAIL_DEFAULT_FROM_NAME || 'LeadMap',
      reply_to: userSettings?.reply_to || globalSettings?.reply_to || process.env.EMAIL_DEFAULT_REPLY_TO || null,
      default_footer: userSettings?.default_footer_html || globalSettings?.default_footer_html || process.env.EMAIL_DEFAULT_FOOTER || '',
      unsubscribe_footer: userSettings?.unsubscribe_footer_html || globalSettings?.unsubscribe_footer_html || '',
      physical_address: userSettings?.physical_address || globalSettings?.physical_address || null,
      transactional_provider: userSettings?.transactional_provider || globalSettings?.transactional_provider || 
        (process.env.RESEND_API_KEY ? 'resend' : 
         process.env.SENDGRID_API_KEY ? 'sendgrid' : 
         process.env.MAILGUN_API_KEY ? 'mailgun' : 'smtp'),
      transactional_from_email: userSettings?.transactional_from_email || globalSettings?.transactional_from_email ||
        process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || null
    }

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('Email settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      from_name,
      reply_to,
      default_footer,
      unsubscribe_footer,
      physical_address,
      transactional_provider,
      transactional_from_email
    } = body

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

    // Upsert user-specific settings
    const { data: settings, error } = await supabaseAdmin
      .from('email_settings')
      .upsert({
        user_id: user.id,
        from_name,
        reply_to,
        default_footer_html: default_footer,
        unsubscribe_footer_html: unsubscribe_footer,
        physical_address,
        transactional_provider,
        transactional_from_email,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Email settings update error:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        from_name: settings.from_name,
        reply_to: settings.reply_to,
        default_footer: settings.default_footer_html,
        unsubscribe_footer: settings.unsubscribe_footer_html,
        physical_address: settings.physical_address,
        transactional_provider: settings.transactional_provider,
        transactional_from_email: settings.transactional_from_email
      }
    })
  } catch (error: any) {
    console.error('Email settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

