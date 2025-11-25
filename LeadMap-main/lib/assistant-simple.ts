/**
 * Simplified Assistant - Direct implementation without complex imports
 */

// Inline knowledge for upgrade questions
const UPGRADE_ANSWER = "To upgrade to Pro, head to the pricing page after your 7-day trial ends. It's $150/month - cancel anytime, no credit card needed for trial."

const UPGRADE_VARIATIONS = [
  "After your free trial wraps up, upgrading to Pro is $150/month. Cancel anytime, no strings attached. Head to pricing when you're ready to upgrade.",
  "Upgrading's easy - once your trial ends, jump on the Pro Plan for $150/month. No credit card needed for trial, cancel Pro anytime. Check out the pricing page when you want to upgrade."
]

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim()
    .replace(/\bwhats\b/gi, 'what is')
    .replace(/\bu\b/gi, 'you')
    .replace(/\bpls\b/gi, 'please')
    .replace(/\bthx\b/gi, 'thanks')
    .replace(/\bty\b/gi, 'thanks')
    .replace(/\s+/g, ' ')
}

export function getSimpleAssistantResponse(query: string): string {
  const normalized = normalizeQuery(query)
  
  // Upgrade queries
  if (normalized.includes('upgrade') || normalized.includes('pro')) {
    if (normalized.includes('again')) {
      return "Same deal - $150/month for Pro after your 7-day trial. Cancel anytime, no credit card needed for trial."
    }
    // Randomly use variation
    if (Math.random() > 0.5 && UPGRADE_VARIATIONS.length > 0) {
      return UPGRADE_VARIATIONS[Math.floor(Math.random() * UPGRADE_VARIATIONS.length)]
    }
    return UPGRADE_ANSWER
  }
  
  // Greetings
  if (normalized.match(/\b(hi|hello|hey|greetings)\b/)) {
    const greetings = [
      "Hey there! 👋 What's up? I'm here to help with anything LeadMap-related.",
      "Hi! 👋 Ready to find some great property leads? What can I help you with?",
      "Hey! What's going on? I'm your LeadMap assistant - ask me anything about the platform."
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  }
  
  // Pricing questions
  if (normalized.includes('cost') || normalized.includes('price') || normalized.includes('pricing') || normalized.includes('how much')) {
    return "We offer a 7-day free trial with no credit card required. After your trial, our Pro Plan is $150/month and includes unlimited leads and access to all features."
  }
  
  // Support questions
  if (normalized.includes('support') || normalized.includes('contact') || normalized.includes('help')) {
    return "For support, you can reach out via email at support@leadmap.com or use the help section in your dashboard. I'm also here to help answer questions about the platform!"
  }
  
  // Map questions
  if (normalized.includes('map') || normalized.includes('red dot') || normalized.includes('marker')) {
    return "The map uses color-coded markers: Red = expired listings, Blue = geo-sourced leads, Green = enriched leads, Purple = probate leads. Click any marker to see property details."
  }
  
  // What is LeadMap
  if (normalized.includes('what is') || normalized.includes("what's") || normalized.includes('about leadmap')) {
    return "LeadMap is an AI-powered SaaS platform designed specifically for real estate professionals. We help you discover undervalued property leads through interactive maps, advanced filtering, and intelligent data enrichment."
  }
  
  // Fallback
  return "I can help with LeadMap questions! Try asking about features, pricing, how to upgrade, or how to use the platform. What would you like to know?"
}

