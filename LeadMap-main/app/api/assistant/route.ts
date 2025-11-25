import { NextRequest, NextResponse } from 'next/server'
import { getAssistantResponse, storeMemory, getMemory } from '@/lib/assistant'
import { getSimpleAssistantResponse } from '@/lib/assistant-simple'
import { getOpenRouterResponse, isOpenRouterConfigured } from '@/lib/openrouter'
import { cookies } from 'next/headers'

/**
 * Enhanced Keyword-based AI Assistant endpoint
 * Uses fuzzy matching, memory, slang normalization - no API calls, instant responses
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get or create session ID from cookies
    const cookieStore = await cookies()
    let sessionId = cookieStore.get('assistant_session_id')?.value
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Get recent memory for context
    const memory = getMemory(sessionId)

    // Get response from assistant - try OpenRouter first, then fallback to local assistants
    let assistantResponse: string = ''
    
    // Check OpenRouter configuration
    const openRouterKey = process.env.OPENROUTER_API_KEY
    const isConfigured = isOpenRouterConfigured()
    
    console.log('OpenRouter check:', {
      isConfigured,
      hasKey: !!openRouterKey,
      keyLength: openRouterKey?.length || 0,
      keyPrefix: openRouterKey?.substring(0, 10) || 'none'
    })
    
    // Try OpenRouter first if configured
    if (isConfigured && openRouterKey) {
      try {
        console.log('[Assistant] Attempting OpenRouter API call...')
        console.log('[Assistant] Message:', message.substring(0, 100))
        console.log('[Assistant] Memory entries:', memory.length)
        
        // Convert memory to conversation history format
        const conversationHistory = memory.slice(-5).map(mem => [
          { role: 'user' as const, content: mem.user },
          { role: 'assistant' as const, content: mem.assistant }
        ]).flat()

        assistantResponse = await getOpenRouterResponse(message, conversationHistory, openRouterKey)
        
        console.log('[Assistant] OpenRouter response received:', {
          length: assistantResponse?.length || 0,
          preview: assistantResponse?.substring(0, 100) || 'none',
          fullResponse: assistantResponse
        })
        
        // Validate response
        if (!assistantResponse || typeof assistantResponse !== 'string') {
          throw new Error('Invalid response type from OpenRouter')
        }
        
        const trimmedResponse = assistantResponse.trim()
        if (trimmedResponse.length === 0) {
          throw new Error('Empty response from OpenRouter after trimming')
        }
        
        // Use the cleaned response
        assistantResponse = trimmedResponse
        
        console.log('[Assistant] Using OpenRouter response (validated)')
      } catch (openRouterError) {
        console.error('[Assistant] OpenRouter failed, falling back to local assistant')
        console.error('[Assistant] Error:', {
          message: openRouterError instanceof Error ? openRouterError.message : String(openRouterError),
          name: openRouterError instanceof Error ? openRouterError.name : 'Unknown',
          stack: openRouterError instanceof Error ? openRouterError.stack?.substring(0, 500) : 'no stack'
        })
        // Fall through to local assistants
        assistantResponse = ''
      }
    } else {
      console.log('[Assistant] OpenRouter not configured, using local assistant')
      console.log('[Assistant] Config check:', {
        isConfigured,
        hasKey: !!openRouterKey,
        keyLength: openRouterKey?.length || 0
      })
    }

    // Fallback to local assistants if OpenRouter failed or not configured
    if (!assistantResponse) {
      // Try simple assistant first (most reliable)
      try {
        assistantResponse = getSimpleAssistantResponse(message)
        if (assistantResponse && typeof assistantResponse === 'string') {
          // Simple assistant worked, use it
        } else {
          throw new Error('Simple assistant returned invalid response')
        }
      } catch (simpleError) {
        console.error('Error in simple assistant, trying enhanced:', simpleError)
        
        // Fallback to enhanced assistant
        try {
          assistantResponse = getAssistantResponse(message, sessionId, memory)
          if (!assistantResponse || typeof assistantResponse !== 'string') {
            throw new Error('Invalid response from enhanced assistant')
          }
        } catch (assistantError) {
          console.error('Error in getAssistantResponse:', assistantError)
          
          // Ultimate fallback - hardcoded responses
          const msgLower = message.toLowerCase()
          if (msgLower.includes('upgrade') || msgLower.includes('pro')) {
            assistantResponse = "To upgrade to Pro, head to the pricing page after your 7-day trial ends. It's $150/month - cancel anytime, no credit card needed for trial."
          } else if (msgLower.includes('cost') || msgLower.includes('price') || msgLower.includes('pricing')) {
            assistantResponse = "We offer a 7-day free trial with no credit card required. After your trial, our Pro Plan is $150/month and includes unlimited leads and access to all features."
          } else if (msgLower.includes('support') || msgLower.includes('contact') || msgLower.includes('help')) {
            assistantResponse = "For support, you can reach out via email at support@leadmap.com or use the help section in your dashboard."
          } else {
            assistantResponse = "I can help with LeadMap questions! Try asking about features, pricing, how to upgrade, or how to use the platform."
          }
        }
      }
    }

    // Store in memory
    storeMemory(sessionId, message, assistantResponse)

    // Simulate natural typing delay (400-900ms)
    const delay = 400 + Math.random() * 500
    await new Promise(resolve => setTimeout(resolve, delay))

    const nextResponse = NextResponse.json({ response: assistantResponse })
    
    // Set session cookie if it's new
    if (!cookieStore.get('assistant_session_id')) {
      nextResponse.cookies.set('assistant_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
    }

    return nextResponse

  } catch (error) {
    console.error('Assistant API error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        response: "I'm sorry, I encountered an error. Please try again later or contact support if the issue persists."
      },
      { status: 200 }
    )
  }
}
