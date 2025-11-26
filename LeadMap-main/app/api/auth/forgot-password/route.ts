import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/sendEmail'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    // Always return same response message to avoid enumeration
    const genericResponse = NextResponse.json({
      message: 'If an account exists, you will receive a password reset email shortly.',
    })

    if (!email) {
      return genericResponse
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_supabase_service_role_key') {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
      // Still return generic response to avoid enumeration
      return genericResponse
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not configured')
      return genericResponse
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

    // Find user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError || !users) {
      // Return generic response even on error to avoid enumeration
      return genericResponse
    }

    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      // User doesn't exist - return generic response to avoid enumeration
      return genericResponse
    }

    // Remove previous tokens for this user
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id)

    // Create reset token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = await bcrypt.hash(rawToken, 12)

    // Store token with expiration (15 minutes)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15)

    const { error: insertError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Error inserting password reset token:', insertError)
      // Still return generic response
      return genericResponse
    }

    // Generate reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`

    // Send email
    const emailSent = await sendEmail({
      to: user.email!,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                We received a request to reset your password for your NextDeal account. Click the button below to reset it:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; margin: 10px 0;">
                ${resetLink}
              </p>
              <p style="font-size: 14px; color: #ef4444; margin-top: 20px; font-weight: 600;">
                ⚠️ This link expires in 15 minutes.
              </p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} NextDeal. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (!emailSent) {
      console.error('Failed to send password reset email')
      // Still return generic response to avoid enumeration
    }

    return genericResponse
  } catch (error: any) {
    console.error('Forgot password error:', error)
    // Always return generic response even on error to avoid enumeration
    return NextResponse.json({
      message: 'If an account exists, you will receive a password reset email shortly.',
    })
  }
}

