/**
 * Email Settings Utilities
 * Handles per-user email settings for branding and compliance
 */

import { createClient } from '@supabase/supabase-js'

export interface EmailSettings {
  id?: string
  user_id?: string
  from_name?: string
  reply_to?: string
  default_footer_html?: string
  unsubscribe_footer_html?: string
  physical_address?: string
  transactional_provider?: string
  transactional_from_email?: string
}

/**
 * Get user's email settings (with fallback to global defaults)
 */
export async function getUserEmailSettings(
  userId: string,
  supabase?: any
): Promise<EmailSettings> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  // Get user-specific settings (handle case where no settings exist)
  let userSettings: EmailSettings | null = null
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (!error && data) {
      userSettings = data
    }
  } catch (error) {
    // Table might not exist or other error - use defaults
    console.warn('Error fetching user email settings:', error)
  }

  // Get global defaults (user_id = NULL) - handle case where no global settings exist
  let globalSettings: EmailSettings | null = null
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .is('user_id', null)
      .maybeSingle()
    
    if (!error && data) {
      globalSettings = data
    }
  } catch (error) {
    // Table might not exist or other error - use defaults
    console.warn('Error fetching global email settings:', error)
  }

  // Merge user settings with global defaults
  return {
    from_name: userSettings?.from_name || globalSettings?.from_name || 'LeadMap',
    reply_to: userSettings?.reply_to || globalSettings?.reply_to || undefined,
    default_footer_html: userSettings?.default_footer_html || globalSettings?.default_footer_html || '',
    unsubscribe_footer_html: userSettings?.unsubscribe_footer_html || globalSettings?.unsubscribe_footer_html || '',
    physical_address: userSettings?.physical_address || globalSettings?.physical_address || undefined,
    transactional_provider: userSettings?.transactional_provider || globalSettings?.transactional_provider || undefined,
    transactional_from_email: userSettings?.transactional_from_email || globalSettings?.transactional_from_email || undefined
  }
}

/**
 * Append compliance footer to email HTML
 * Includes unsubscribe link and physical address (CAN-SPAM compliance)
 */
export function appendComplianceFooter(
  html: string,
  settings: EmailSettings,
  unsubscribeUrl?: string
): string {
  let footer = ''

  // Add physical address if provided (CAN-SPAM requirement)
  if (settings.physical_address) {
    footer += `<div style="color: #666; font-size: 11px; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee;">
      <p style="margin: 5px 0;">${settings.physical_address}</p>
    </div>`
  }

  // Add unsubscribe footer if provided
  if (settings.unsubscribe_footer_html) {
    let unsubscribeHtml = settings.unsubscribe_footer_html
    
    // Replace {{unsubscribe_url}} placeholder if unsubscribeUrl is provided
    if (unsubscribeUrl) {
      unsubscribeHtml = unsubscribeHtml.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
    }
    
    footer += unsubscribeHtml
  } else if (unsubscribeUrl) {
    // Default unsubscribe footer if none provided
    footer += `<p style="color: #666; font-size: 11px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
      You received this email because you are subscribed to our mailing list.
      <a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a>
    </p>`
  }

  // Add default footer if provided
  if (settings.default_footer_html) {
    footer += settings.default_footer_html
  }

  // Append footer to HTML
  if (footer) {
    // Try to insert before closing body tag, otherwise append
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${footer}</body>`)
    } else {
      html += footer
    }
  }

  return html
}

/**
 * Get unsubscribe URL for a user/contact
 */
export function getUnsubscribeUrl(
  userId: string,
  contactId?: string,
  baseUrl?: string
): string {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || ''
  const params = new URLSearchParams({
    user_id: userId
  })
  
  if (contactId) {
    params.append('contact_id', contactId)
  }
  
  return `${appUrl}/api/emails/unsubscribe?${params.toString()}`
}

