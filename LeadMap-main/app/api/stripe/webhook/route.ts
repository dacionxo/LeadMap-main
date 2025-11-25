import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies: async () => await cookies() })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id

        // Determine plan tier based on price ID
        let planTier = 'pro'
        // Both monthly and annual are the same pro tier

        // Update user subscription status
        const { error } = await supabase
          .from('users')
          .update({
            is_subscribed: true,
            plan_tier: planTier,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating user subscription:', error)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Update subscription status based on status
        const isActive = subscription.status === 'active'
        
        const { error } = await supabase
          .from('users')
          .update({
            is_subscribed: isActive
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating subscription status:', error)
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Mark subscription as inactive
        const { error } = await supabase
          .from('users')
          .update({
            is_subscribed: false,
            plan_tier: 'free'
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating subscription status:', error)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
