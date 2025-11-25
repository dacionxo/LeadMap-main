'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Cloud, Search, Database, Brain, Target } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

type SolutionType = 'lead-discovery' | 'data-enrichment' | 'market-intelligence' | 'deal-execution'

export default function PricingPage() {
  const router = useRouter()
  const [isAnnual, setIsAnnual] = useState(true)
  const [selectedSolution, setSelectedSolution] = useState<SolutionType>('lead-discovery')

  // Debug: Log environment variables on mount
  console.log('Available price IDs:', {
    monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
    annual: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Missing'
  })

  const solutionDescriptions = {
    'lead-discovery': {
      free: 'Discover and qualify high-intent properties with AI-powered search and filters.',
      pro: 'Unlock predictive scoring, instant owner intel, and automation for every prospecting workflow.'
    },
    'data-enrichment': {
      free: 'Access essential property and ownership data to enrich your pipeline.',
      pro: 'Get comprehensive property insights, verified contact data, and automated enrichment across your CRM.'
    },
    'market-intelligence': {
      free: 'Track market shifts with curated snapshots and smart alerts.',
      pro: 'Monitor emerging trends, neighborhood demand, and heatmaps to stay ahead of every opportunity.'
    },
    'deal-execution': {
      free: 'Manage deals and follow-ups with built-in reminders and simple automation.',
      pro: 'Coordinate outreach, automate follow-ups, and accelerate every closing with collaborative workspaces.'
    }
  }

  const solutionColors = {
    'lead-discovery': {
      ring: 'ring-primary-400 dark:ring-primary-500',
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      border: 'border-primary-200 dark:border-primary-800'
    },
    'data-enrichment': {
      ring: 'ring-success-400 dark:ring-success-500',
      bg: 'bg-success-50 dark:bg-success-900/20',
      border: 'border-success-200 dark:border-success-800'
    },
    'market-intelligence': {
      ring: 'ring-secondary-400 dark:ring-secondary-500',
      bg: 'bg-secondary-50 dark:bg-secondary-900/20',
      border: 'border-secondary-200 dark:border-secondary-800'
    },
    'deal-execution': {
      ring: 'ring-accent-400 dark:ring-accent-500',
      bg: 'bg-accent-50 dark:bg-accent-900/20',
      border: 'border-accent-200 dark:border-accent-800'
    }
  }

  const solutions = [
    { id: 'lead-discovery' as SolutionType, name: 'Lead Discovery', icon: Search },
    { id: 'data-enrichment' as SolutionType, name: 'Data Enrichment', icon: Database },
    { id: 'market-intelligence' as SolutionType, name: 'Market Intelligence', icon: Brain },
    { id: 'deal-execution' as SolutionType, name: 'Deal Execution', icon: Target }
  ]

  const plans = [
    {
      name: 'Free Trial',
      price: '$0',
      period: '',
      description: solutionDescriptions[selectedSolution].free,
      credits: '7-day trial access, full platform features',
      cta: 'Get started',
      ctaAction: () => router.push('/'),
      popular: false,
      trial: true,
      secondaryCta: null
    },
    {
      name: 'NextDeal Pro',
      price: isAnnual ? '$120' : '$150',
      period: isAnnual ? 'Per month, billed annually' : 'Per month',
      description: solutionDescriptions[selectedSolution].pro,
      credits: 'Unlimited leads per month, all features included',
      cta: 'Buy now',
      secondaryCta: 'Start 14-day trial',
      popular: true,
      getPriceId: () => isAnnual 
        ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID 
        : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
    }
  ]

  const handleUpgrade = async (priceId: string) => {
    console.log('handleUpgrade called with priceId:', priceId)
    console.log('Stripe publishable key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    
    try {
      console.log('Creating checkout session...')
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (data.sessionId) {
        console.log('Loading Stripe...')
        const { loadStripe } = await import('@stripe/stripe-js')
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        )

        if (stripe) {
          console.log('Redirecting to checkout...')
          const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
          if (error) {
            console.error('Error redirecting to checkout:', error)
          }
        } else {
          console.error('Stripe failed to load')
        }
      } else {
        console.error('No sessionId in response:', data)
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8E3D6' }}>
      {/* Navigation */}
      <nav style={{ backgroundColor: '#E8E3D6' }} className="border-b border-gray-200 dark:border-gray-700">
        <div className="w-full mx-4 sm:mx-6 lg:mx-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => router.push('/')} className="text-xl font-bold text-gray-900 dark:text-white">
                NextDeal
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={() => router.push('/')}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
          </div>
        </div>
      </nav>

      {/* White Overlay Container */}
      <div className="relative z-10 mt-16 mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="bg-neutral-light dark:bg-neutral-dark rounded-2xl sm:rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
            <div className="text-left md:text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                The all-in-one platform to grow your business
          </h1>
            </div>
            <div className="text-left md:text-center max-w-md">
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Build pipeline smarter, close deals faster, and unify your tech stack with an AI-powered platform.
          </p>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                !isAnnual
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
            >
              Monthly billing
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                isAnnual
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              Annual billing
            {isAnnual && (
                <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-accent text-gray-900 text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap">
                  SAVE 20%
              </span>
            )}
            </button>
          </div>

          {/* Solution Tabs */}
          <div className="mb-12">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Explore features by solutions:
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All tiers include every solution
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {solutions.map((solution) => {
                const Icon = solution.icon
                const isSelected = selectedSolution === solution.id
                const colors = solutionColors[solution.id]
                return (
                  <button
                    key={solution.id}
                    onClick={() => setSelectedSolution(solution.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.border} border-2 text-gray-900 dark:text-white`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{solution.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
          {plans.map((plan) => {
            const colors = solutionColors[selectedSolution]
            return (
            <div
              key={plan.name}
              className={`relative bg-neutral-light dark:bg-neutral-dark rounded-2xl border-2 p-8 transition-all ${
                plan.popular 
                  ? `ring-2 ${colors.ring} ${colors.border}` 
                  : `border-gray-200 dark:border-gray-700 ${colors.bg}`
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent text-gray-900 px-3 py-1 rounded-full text-xs font-semibold">
                    MOST POPULAR
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">{plan.description}</p>
                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                  </div>
                  {plan.period && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plan.period}</p>
                  )}
                </div>
                {plan.credits && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Cloud className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{plan.credits}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
              <button
                onClick={() => {
                  if (plan.trial) {
                    plan.ctaAction?.()
                  } else {
                    const priceId = plan.getPriceId?.()
                    if (priceId) {
                      handleUpgrade(priceId)
                    }
                  }
                }}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                    : plan.trial
                      ? 'bg-accent text-gray-900 hover:bg-accent-600'
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                }`}
              >
                {plan.cta}
              </button>
                {plan.secondaryCta && (
                  <button
                    onClick={() => router.push('/')}
                    className="w-full py-2 px-4 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {plan.secondaryCta}
                  </button>
                )}
                <a
                  href="#features"
                  className="block text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Learn more
                </a>
              </div>
            </div>
            )
          })}
        </div>

        {/* Features Comparison */}
        <div className="bg-neutral-light dark:bg-neutral-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Feature Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-semibold">Features</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-semibold">Free Trial</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-semibold">NextDeal Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">Monthly Leads</td>
                  <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">Unlimited</td>
                  <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">Map View</td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">Price Drop Alerts</td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">Advanced Filtering</td>
                  <td className="py-4 px-4 text-center text-gray-400">—</td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">API Access</td>
                  <td className="py-4 px-4 text-center text-gray-400">—</td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">Priority Support</td>
                  <td className="py-4 px-4 text-center text-gray-400">—</td>
                  <td className="py-4 px-4 text-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel my subscription anytime?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can cancel your subscription at any time. You will continue to have access 
                until the end of your current billing period.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What happens after my free trial ends?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                After your 7-day free trial, you will need to choose a paid plan to continue accessing 
                leads. No charges will be made during your trial period.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Do you offer refunds?
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                We offer a 30-day money-back guarantee. If you are not satisfied, contact our 
                support team for a full refund.
              </p>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
