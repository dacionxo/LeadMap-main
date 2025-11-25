'use client'

import { useRouter } from 'next/navigation'
import { Crown, CheckCircle, Zap } from 'lucide-react'

export default function TrialExpired() {
  const router = useRouter()

  const plans = [
    {
      name: 'LeadMap Pro',
      price: '$150',
      period: '/month',
      description: 'All features, one simple price',
      features: [
        'Unlimited leads',
        'Advanced filtering & search',
        'Price drop alerts',
        'Interactive map view',
        'Priority support',
        'Custom alerts',
        'API access'
      ],
      priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
      popular: true
    }
  ]

  const handleUpgrade = async (priceId: string) => {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      const { sessionId } = await response.json()

      if (sessionId) {
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        )

        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId })
          if (error) {
            console.error('Error redirecting to checkout:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="mx-auto w-16 h-16 bg-yellow-900 rounded-full flex items-center justify-center mb-6">
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Your Free Trial Has Ended
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Upgrade to continue accessing premium real estate leads and unlock your next deal.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-1 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative card ${
                plan.popular ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => plan.priceId && handleUpgrade(plan.priceId)}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-white text-center mb-6">
            Why Choose LeadMap?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Zap className="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-white mb-2">Real-time Alerts</h4>
              <p className="text-gray-400">
                Get instant notifications when properties drop in price or hit the market.
              </p>
            </div>
            <div className="text-center">
              <Crown className="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-white mb-2">Premium Data</h4>
              <p className="text-gray-400">
                Access to comprehensive property data and market insights.
              </p>
            </div>
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-white mb-2">Proven Results</h4>
              <p className="text-gray-400">
                Join thousands of successful real estate professionals.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            Questions? Contact our support team at{' '}
            <a href="mailto:support@leadmap.com" className="text-primary-400 hover:text-primary-300">
              support@leadmap.com
            </a>
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
