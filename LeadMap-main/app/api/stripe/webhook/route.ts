import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-singleton'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

/** Insert in-app notification for a user by Stripe customer id */
async function notifyUserByStripeCustomerId(
  supabase: ReturnType<typeof getServiceRoleClient>,
  customerId: string,
  type: 'warning' | 'system',
  title: string,
  message: string,
  link: string | null,
  notificationCode: string
) {
  const { data: userRow } = await (supabase.from('users') as any)
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  if (!userRow?.id) return
  await (supabase.from('notifications') as any).insert({
    user_id: userRow.id,
    type,
    title,
    message,
    link,
    notification_code: notificationCode,
    read: false,
  })
}

/**
 * Map Stripe subscription status to our subscription_status enum
 */
function mapStripeStatusToSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'none' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete'
    default:
      return 'none'
  }
}

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

  // Use service role client for webhook (no auth cookies needed)
  const supabase = getServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!subscriptionId) {
          console.error('No subscription ID in checkout session')
          break
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const priceId = subscription.items.data[0].price.id

        // Determine plan tier based on price ID
        let planTier = 'pro'
        // Both monthly and annual are the same pro tier

        const subscriptionStatus = mapStripeStatusToSubscriptionStatus(subscription.status)

        // Update user subscription status
        // Type assertion needed because service role client doesn't have database schema types
        const { error } = await (supabase
          .from('users') as any)
          .update({
            is_subscribed: subscription.status === 'active' || subscription.status === 'trialing',
            subscription_status: subscriptionStatus,
            plan_tier: planTier,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId as string
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating user subscription:', error)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }

        await notifyUserByStripeCustomerId(
          supabase,
          customerId,
          'system',
          'Subscription upgraded',
          'Your subscription is now active. Thank you for upgrading!',
          '/dashboard/billing',
          'subscription_upgrade'
        )
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const subscriptionStatus = mapStripeStatusToSubscriptionStatus(subscription.status)
        const isActive = subscription.status === 'active' || subscription.status === 'trialing'
        
        // Type assertion needed because service role client doesn't have database schema types
        const { error } = await (supabase
          .from('users') as any)
          .update({
            is_subscribed: isActive,
            subscription_status: subscriptionStatus,
            stripe_subscription_id: subscription.id,
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating subscription status:', error)
        }

        if (subscription.status === 'past_due') {
          await notifyUserByStripeCustomerId(
            supabase,
            customerId,
            'warning',
            'Payment overdue',
            'Your paid plan payment is overdue. Please update your payment method to avoid service interruption.',
            '/dashboard/billing',
            'plan_overdue'
          )
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Mark subscription as canceled
        const { error } = await (supabase
          .from('users') as any)
          .update({
            is_subscribed: false,
            subscription_status: 'canceled',
            plan_tier: 'free'
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error updating subscription status:', error)
        }

        await notifyUserByStripeCustomerId(
          supabase,
          customerId,
          'system',
          'Subscription canceled',
          'Your subscription has been canceled. Resubscribe anytime from Billing.',
          '/dashboard/billing',
          'system'
        )
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        await notifyUserByStripeCustomerId(
          supabase,
          customerId,
          'warning',
          'Payment failed',
          'We couldn’t charge your payment method. Please update it to avoid service interruption.',
          '/dashboard/billing',
          'account_overdue'
        )
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
