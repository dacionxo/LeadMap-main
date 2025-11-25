/**
 * OpenRouter API Integration
 * Uses free models for AI assistant responses
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Free models available on OpenRouter (try these in order)
const FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-2b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
  // Fallback models without :free suffix (some may still be free)
  'meta-llama/llama-3.2-3b-instruct',
  'google/gemma-2-2b-it'
]

// Default to first free model
const DEFAULT_MODEL = FREE_MODELS[0]

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string
      content: string
    }
  }>
  error?: {
    message: string
    code?: string
  }
}

/**
 * Get AI response from OpenRouter using free model
 */
export async function getOpenRouterResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  apiKey?: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenRouter API key is required')
  }

  // Build conversation messages
  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: `You are LeadMap Assistant, a helpful AI assistant for LeadMap - a real estate lead generation platform.

LeadMap helps real estate professionals discover undervalued property leads through:
- Interactive maps with color-coded markers
- Advanced filtering and search
- Intelligent data enrichment
- Email templates
- Probate and expired listing tracking

Key information:
- Free trial: 7 days, no credit card required
- Pro Plan: $150/month after trial, cancel anytime
- Support: support@leadmap.com

Be friendly, conversational, and helpful. Keep responses concise and focused on LeadMap features and questions.`
    },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user',
      content: userMessage
    }
  ]

  // Try models in order until one works
  let lastError: Error | null = null
  
  for (const model of FREE_MODELS) {
    try {
      console.log(`[OpenRouter] Attempting model: ${model}`)
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://leadmap.com',
          'X-Title': 'LeadMap Assistant'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        })
      })

      const responseText = await response.text()
      console.log(`[OpenRouter] Response status: ${response.status}`)
      console.log(`[OpenRouter] Response preview: ${responseText.substring(0, 200)}`)

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { message: responseText }
        }
        
        const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status} ${response.statusText}`
        console.error(`[OpenRouter] Model ${model} failed:`, errorMessage)
        lastError = new Error(`Model ${model}: ${errorMessage}`)
        continue // Try next model
      }

      const data: OpenRouterResponse = JSON.parse(responseText)

      if (data.error) {
        console.error(`[OpenRouter] Model ${model} returned error:`, data.error.message)
        lastError = new Error(data.error.message || 'OpenRouter API error')
        continue // Try next model
      }

      if (!data.choices || data.choices.length === 0) {
        console.error(`[OpenRouter] Model ${model} returned no choices`)
        lastError = new Error('No response from OpenRouter')
        continue // Try next model
      }

      let assistantMessage = data.choices[0]?.message?.content
      if (!assistantMessage) {
        console.error(`[OpenRouter] Model ${model} returned empty message`)
        lastError = new Error('Empty response from OpenRouter')
        continue // Try next model
      }

      // Clean up common model artifacts
      assistantMessage = assistantMessage
        .replace(/^<s>\s*/i, '') // Remove <s> token at start
        .replace(/\s*<\/s>\s*$/i, '') // Remove </s> token at end
        .replace(/\[OUT\]\s*/gi, '') // Remove [OUT] markers
        .replace(/\[INST\]\s*/gi, '') // Remove [INST] markers
        .replace(/\[\/INST\]\s*/gi, '') // Remove [/INST] markers
        .trim()

      if (!assistantMessage || assistantMessage.length === 0) {
        console.error(`[OpenRouter] Model ${model} returned empty message after cleaning`)
        lastError = new Error('Empty response from OpenRouter after cleaning')
        continue // Try next model
      }

      console.log(`[OpenRouter] Success with model: ${model}`)
      return assistantMessage

    } catch (error) {
      console.error(`[OpenRouter] Model ${model} exception:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      continue // Try next model
    }
  }

  // All models failed
  console.error('[OpenRouter] All models failed. Last error:', lastError)
  throw lastError || new Error('All OpenRouter models failed')
}

/**
 * Check if OpenRouter is configured
 */
export function isOpenRouterConfigured(): boolean {
  const key = process.env.OPENROUTER_API_KEY
  const isConfigured = !!key && key.trim().length > 0
  console.log('isOpenRouterConfigured check:', {
    hasKey: !!key,
    keyLength: key?.length || 0,
    trimmedLength: key?.trim().length || 0,
    isConfigured
  })
  return isConfigured
}

