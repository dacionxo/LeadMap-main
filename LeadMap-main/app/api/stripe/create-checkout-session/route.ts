import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const { priceId, customerEmail } = await request.json()
    
    console.log('Creating checkout session with priceId:', priceId)
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    
    let customerId: string | undefined
    let userEmail: string | undefined

    if (user) {
      // User is authenticated, get/create customer
      userEmail = user.email!
      
      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      customerId = profile?.stripe_customer_id

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabase_user_id: user.id
          }
        })
        customerId = customer.id

        // Update user with customer ID if profile exists
        if (profile) {
          await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', user.id)
        }
      }
    } else if (customerEmail) {
      // For unauthenticated users, create session with email
      userEmail = customerEmail
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    }

    // Add customer if we have one
    if (customerId) {
      sessionParams.customer = customerId
    } else if (userEmail) {
      sessionParams.customer_email = userEmail
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
