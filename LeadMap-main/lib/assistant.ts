/**
 * Enhanced Keyword-based AI Assistant for LeadMap
 * Uses fuzzy matching, memory, slang normalization, and conversational responses
 */

// Lazy load knowledge base to avoid module load errors
let knowledge: any = null

function getKnowledge() {
  if (knowledge) return knowledge
  
  try {
    // Try to import - use dynamic import for serverless compatibility
    const knowledgeData = require('./knowledge.json')
    knowledge = knowledgeData.default || knowledgeData
    if (!knowledge) {
      throw new Error('Knowledge data is null')
    }
  } catch (importError) {
    console.error('Failed to load knowledge.json:', importError)
    // Provide minimal fallback structure
    knowledge = {
      features: [],
      common_questions: [
        {
          question: "how do i upgrade",
          keywords: ["upgrade", "pro", "upgrade to pro"],
          answer: "To upgrade to Pro, head to the pricing page after your 7-day trial ends. It's $150/month - cancel anytime, no credit card needed for trial."
        }
      ],
      greetings: [],
      small_talk: [],
      nonsense: [],
      responses: {
        fallback: ["I can help with LeadMap questions. Try asking about features, pricing, or how to use the platform."],
        thinking_phrases: ["Let me think..."],
        confidence_boosters: ["Sure!"],
        filler_phrases: ["Here's what I know:"]
      },
      product: {
        description: "LeadMap is a real estate lead generation platform.",
        tagline: "The AI lead platform for faster, smarter closings"
      }
    }
  }
  
  return knowledge
}

interface KnowledgeEntry {
  keywords: string[]
  title: string
  description: string
  details?: string[]
  variations?: string[]
}

interface Question {
  question: string
  keywords: string[]
  answer: string
  variations?: string[]
}

interface MemoryEntry {
  user: string
  assistant: string
  timestamp: number
}

// In-memory session storage (cleared on server restart)
const sessionMemory = new Map<string, MemoryEntry[]>()

// Synonym replacement map
const synonyms: Record<string, string> = {
  'whats': 'what is',
  "what's": 'what is',
  'u': 'you',
  'ur': 'your',
  'pls': 'please',
  'thx': 'thanks',
  'ty': 'thanks',
  'thru': 'through',
  'tho': 'though',
  'r': 'are',
  'yr': 'year',
  'w/': 'with',
  'w/o': 'without',
  '&': 'and',
  '+': 'and',
  'upgrade': 'upgrade',
  'upgrading': 'upgrade',
  'subscribe': 'upgrade',
  'subscription': 'upgrade'
}

// Slang words to strip (but keep context)
const slangToStrip = ['yo', 'bro', 'dude', 'man', 'hey', 'sup', 'lol', 'haha', 'omg']

/**
 * Normalize text: replace synonyms, strip slang, lowercase
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase().trim()
  
  // Replace synonyms
  for (const [slang, proper] of Object.entries(synonyms)) {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi')
    normalized = normalized.replace(regex, proper)
  }
  
  // Strip slang words (but keep the rest)
  for (const slang of slangToStrip) {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi')
    normalized = normalized.replace(regex, '')
  }
  
  // Clean up extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()
  
  return normalized
}

/**
 * Simple Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  const len1 = str1.length
  const len2 = str2.length

  if (len1 === 0) return len2
  if (len2 === 0) return len1

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[len2][len1]
}

/**
 * Calculate similarity ratio (0-1) using Levenshtein distance
 */
function similarityRatio(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1.0
  const distance = levenshteinDistance(str1, str2)
  return 1 - distance / maxLen
}

/**
 * Token-based similarity (word overlap)
 */
function tokenSimilarity(query: string, text: string): number {
  const queryTokens = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const textTokens = new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  
  if (queryTokens.size === 0) return 0
  
  // Convert Sets to arrays for iteration
  const queryTokensArray = Array.from(queryTokens)
  const textTokensArray = Array.from(textTokens)
  
  let matches = 0
  for (const token of queryTokensArray) {
    // Check exact match
    if (textTokens.has(token)) {
      matches++
      continue
    }
    // Check substring match
    for (const textToken of textTokensArray) {
      if (textToken.includes(token) || token.includes(textToken)) {
        matches++
        break
      }
    }
  }
  
  return matches / queryTokens.size
}

/**
 * Enhanced fuzzy matching combining multiple strategies
 */
function fuzzyMatch(query: string, text: string): number {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  
  // Exact match
  if (textLower.includes(queryLower)) return 1.0
  
  // Token similarity (word overlap)
  const tokenScore = tokenSimilarity(queryLower, textLower)
  
  // Levenshtein similarity for shorter strings
  let levenshteinScore = 0
  if (queryLower.length < 50 && textLower.length < 100) {
    levenshteinScore = similarityRatio(queryLower, textLower)
  }
  
  // Combined score (weighted)
  return Math.max(tokenScore * 0.7, levenshteinScore * 0.3)
}

/**
 * Calculate similarity score between query and entry
 */
function calculateScore(
  query: string,
  entry: KnowledgeEntry | Question,
  memoryContext: MemoryEntry[] = []
): number {
  const queryLower = query.toLowerCase()
  let score = 0
  
  // Check keyword matches (weighted highest)
  const keywords = entry.keywords || []
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase()
    if (queryLower.includes(keywordLower)) {
      score += 3.0 // Strong keyword match
    } else {
      // Fuzzy keyword match
      const fuzzyScore = fuzzyMatch(keywordLower, queryLower)
      if (fuzzyScore > 0.5) {
        score += fuzzyScore * 2.0
      }
    }
  }
  
  // Check if it's a Question or KnowledgeEntry
  if ('question' in entry) {
    // It's a Question
    const question = entry.question || ''
    score += fuzzyMatch(query, question) * 2.5
  } else {
    // It's a KnowledgeEntry
    const title = entry.title || ''
    const description = entry.description || ''
    score += fuzzyMatch(query, title) * 2.0
    score += fuzzyMatch(query, description) * 1.5
  }
  
  // Boost score if this topic appeared recently in memory
  for (const mem of memoryContext) {
    const memText = (mem.user + ' ' + mem.assistant).toLowerCase()
    if ('question' in entry) {
      if (memText.includes(entry.question.toLowerCase())) {
        score += 1.5 // Recent context boost
      }
    } else {
      if (memText.includes(entry.title.toLowerCase()) || memText.includes(entry.description.toLowerCase())) {
        score += 1.5 // Recent context boost
      }
    }
  }
  
  return score
}

/**
 * Get random element from array
 */
function randomElement<T>(arr: T[]): T {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    throw new Error(`Cannot select random element: array is ${arr ? 'empty' : 'invalid'}`)
  }
  const index = Math.floor(Math.random() * arr.length)
  if (index >= arr.length || index < 0) {
    throw new Error(`Invalid index ${index} for array of length ${arr.length}`)
  }
  return arr[index]
}

/**
 * Add conversational flair with thinking phrases and variations
 */
function addConversationalFlair(
  text: string,
  isConfident: boolean,
  hasVariations: boolean = false,
  variations?: string[]
): string {
  try {
    // Validate text
    if (!text || typeof text !== 'string') {
      return text || "I can help with that!"
    }

    const knowledge = getKnowledge()

    // Sometimes use a variation if available
    if (hasVariations && variations && Array.isArray(variations) && variations.length > 0 && Math.random() > 0.6) {
      try {
        text = randomElement(variations)
      } catch (e) {
        // If variation selection fails, use original text
        console.error('Error selecting variation:', e)
      }
    }
    
    // Add thinking phrase sometimes
    if (Math.random() > 0.7 && knowledge?.responses?.thinking_phrases && Array.isArray(knowledge.responses.thinking_phrases) && knowledge.responses.thinking_phrases.length > 0) {
      try {
        const thinkingPhrase = randomElement(knowledge.responses.thinking_phrases)
        return `${thinkingPhrase} ${text}`
      } catch (e) {
        // Continue without thinking phrase
      }
    }
    
    // Add confidence booster sometimes
    if (isConfident && Math.random() > 0.5 && knowledge?.responses?.confidence_boosters && Array.isArray(knowledge.responses.confidence_boosters) && knowledge.responses.confidence_boosters.length > 0) {
      try {
        const booster = randomElement(knowledge.responses.confidence_boosters)
        return `${booster} ${text}`
      } catch (e) {
        // Continue without booster
      }
    }
    
    // Add filler phrase sometimes
    if (Math.random() > 0.4 && knowledge?.responses?.filler_phrases && Array.isArray(knowledge.responses.filler_phrases) && knowledge.responses.filler_phrases.length > 0) {
      try {
        const filler = randomElement(knowledge.responses.filler_phrases)
        return `${filler} ${text.toLowerCase()}`
      } catch (e) {
        // Continue without filler
      }
    }
    
    return text
  } catch (error) {
    console.error('Error in addConversationalFlair:', error)
    return text || "I can help with that!"
  }
}

/**
 * Check for greetings
 */
function handleGreeting(query: string): string | null {
  const knowledge = getKnowledge()
  if (!knowledge.greetings || !Array.isArray(knowledge.greetings)) {
    return null
  }
  
  const normalized = normalizeText(query)
  
  for (const greeting of knowledge.greetings) {
    if (!greeting.keywords || !greeting.responses) continue
    for (const keyword of greeting.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return randomElement(greeting.responses)
      }
    }
  }
  
  return null
}

/**
 * Check for small talk
 */
function handleSmallTalk(query: string): string | null {
  const knowledge = getKnowledge()
  if (!knowledge.small_talk || !Array.isArray(knowledge.small_talk)) {
    return null
  }
  
  const normalized = normalizeText(query)
  
  for (const talk of knowledge.small_talk) {
    if (!talk.keywords || !talk.responses) continue
    for (const keyword of talk.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return randomElement(talk.responses)
      }
    }
  }
  
  return null
}

/**
 * Check for nonsense queries
 */
function handleNonsense(query: string): string | null {
  const knowledge = getKnowledge()
  if (!knowledge.nonsense || !Array.isArray(knowledge.nonsense)) {
    return null
  }
  
  const normalized = normalizeText(query)
  
  for (const nonsense of knowledge.nonsense) {
    if (!nonsense.keywords || !nonsense.responses) continue
    for (const keyword of nonsense.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return randomElement(nonsense.responses)
      }
    }
  }
  
  return null
}

/**
 * Get assistant response with memory and context
 */
export function getAssistantResponse(
  query: string,
  sessionId: string = 'default',
  memory: MemoryEntry[] = []
): string {
  try {
    // Load knowledge base
    const knowledge = getKnowledge()

    // Validate query
    if (!query || typeof query !== 'string') {
      return "I didn't quite catch that. Could you try asking again?"
    }

    const normalizedQuery = normalizeText(query)
    
    // Quick check for upgrade queries before complex matching
    if (normalizedQuery.includes('upgrade') || normalizedQuery.includes('pro')) {
      try {
        // Direct upgrade response if knowledge base has issues
        if (!knowledge.common_questions || !Array.isArray(knowledge.common_questions)) {
          return "To upgrade to Pro, head to the pricing page after your 7-day trial ends. It's $150/month - cancel anytime, no credit card needed for trial."
        }
      } catch (e) {
        console.error('Error in quick upgrade check:', e)
        return "To upgrade to Pro, head to the pricing page after your 7-day trial ends. It's $150/month - cancel anytime, no credit card needed for trial."
      }
    }
  
    // Get memory for this session
    const sessionMem = sessionMemory.get(sessionId) || []
    const recentMemory = sessionMem.slice(-3) // Last 3 exchanges
  
  // Check greetings first
  try {
    const greeting = handleGreeting(query)
    if (greeting) {
      return greeting
    }
  } catch (e) {
    console.error('Error in handleGreeting:', e)
  }
  
  // Check small talk
  try {
    const smallTalk = handleSmallTalk(query)
    if (smallTalk) {
      return smallTalk
    }
  } catch (e) {
    console.error('Error in handleSmallTalk:', e)
  }
  
  // Check nonsense queries
  try {
    const nonsense = handleNonsense(query)
    if (nonsense) {
      return nonsense
    }
  } catch (e) {
    console.error('Error in handleNonsense:', e)
  }
  
    // Check common questions first
    let bestQuestion: Question | null = null
    let bestQuestionScore = 0
    
    try {
      const knowledge = getKnowledge()
      if (knowledge && knowledge.common_questions && Array.isArray(knowledge.common_questions)) {
        for (const question of knowledge.common_questions) {
          try {
            const score = calculateScore(normalizedQuery, question, recentMemory)
            if (score > bestQuestionScore) {
              bestQuestionScore = score
              bestQuestion = question
            }
          } catch (scoreError) {
            console.error('Error calculating score for question:', scoreError)
            // Continue to next question
          }
        }
      }
    } catch (questionsError) {
      console.error('Error processing common questions:', questionsError)
    }
  
  // If we found a good match for a common question, use it
  if (bestQuestion && bestQuestionScore > 1.5) {
    try {
      let answer = bestQuestion.answer
      
      // Use variations if available
      if (bestQuestion.variations && Array.isArray(bestQuestion.variations) && bestQuestion.variations.length > 0) {
        if (Math.random() > 0.5) {
          answer = randomElement(bestQuestion.variations)
        }
      }
      
      // Use context from memory to shorten response if relevant
      try {
        if (recentMemory && Array.isArray(recentMemory) && recentMemory.length > 0) {
          const lastMem = recentMemory[recentMemory.length - 1]
          if (lastMem && lastMem.assistant && typeof lastMem.assistant === 'string') {
            const lastText = lastMem.assistant.toLowerCase()
            
            // If they ask "again" and we just talked about upgrade/pricing
            if (normalizedQuery.includes('again') && (lastText.includes('upgrade') || lastText.includes('$150') || lastText.includes('pro'))) {
              return "Same deal - $150/month for Pro after your 7-day trial. Cancel anytime, no credit card needed for trial."
            }
            
            // If we just talked about pricing/upgrade and they ask about trial
            if ((lastText.includes('upgrade') || lastText.includes('$150')) && 
                (normalizedQuery.includes('trial') || normalizedQuery.includes('free'))) {
              return "Same plan - 7-day trial, then $150/month. Cancel anytime."
            }
            
            // If we just talked about trial and they ask about upgrade
            if (lastText.includes('trial') && normalizedQuery.includes('upgrade')) {
              return "After your 7-day trial ends, it's $150/month for Pro. No credit card needed for trial, cancel Pro anytime."
            }
          }
        }
      } catch (memoryError) {
        // If memory check fails, continue without context
        console.error('Error checking memory context:', memoryError)
      }
      
      try {
        return addConversationalFlair(
          answer,
          bestQuestionScore > 3.0,
          bestQuestion.variations !== undefined && Array.isArray(bestQuestion.variations) && bestQuestion.variations.length > 0,
          bestQuestion.variations
        )
      } catch (flairError) {
        console.error('Error adding conversational flair:', flairError)
        // Return answer without flair if flair fails
        return answer
      }
    } catch (error) {
      console.error('Error processing question match:', error)
      // Fallback to simple answer
      return bestQuestion.answer || "I can help with that! Check the pricing page for upgrade options."
    }
  }
  
    // Otherwise, search through features
    let bestFeature: KnowledgeEntry | null = null
    let bestFeatureScore = 0
    
    try {
      const knowledge = getKnowledge()
      if (knowledge.features && Array.isArray(knowledge.features)) {
        for (const feature of knowledge.features) {
          try {
            const score = calculateScore(normalizedQuery, feature, recentMemory)
            if (score > bestFeatureScore) {
              bestFeatureScore = score
              bestFeature = feature
            }
          } catch (scoreError) {
            console.error('Error calculating score for feature:', scoreError)
            // Continue to next feature
          }
        }
      }
    } catch (featuresError) {
      console.error('Error processing features:', featuresError)
    }
  
  // If we found a good feature match
  if (bestFeature && bestFeatureScore > 1.0) {
    try {
      let response = bestFeature.description || "I can help with that feature!"
      
      // Use variations if available
      if (bestFeature.variations && Array.isArray(bestFeature.variations) && bestFeature.variations.length > 0 && Math.random() > 0.4) {
        try {
          response = randomElement(bestFeature.variations)
        } catch (e) {
          // Use description if variation fails
          console.error('Error selecting feature variation:', e)
        }
      }
      
      // Sometimes add details
      if (bestFeature.details && Array.isArray(bestFeature.details) && bestFeature.details.length > 0 && Math.random() > 0.4) {
        try {
          const detailCount = Math.min(2, bestFeature.details.length)
          const selectedDetails = bestFeature.details.slice(0, detailCount)
          response += ` Some key features include: ${selectedDetails.join(', ')}.`
        } catch (e) {
          // Continue without details
          console.error('Error adding feature details:', e)
        }
      }
      
      try {
        return addConversationalFlair(
          response,
          bestFeatureScore > 2.0,
          bestFeature.variations !== undefined && Array.isArray(bestFeature.variations) && bestFeature.variations.length > 0,
          bestFeature.variations
        )
      } catch (flairError) {
        console.error('Error adding flair to feature response:', flairError)
        return response
      }
    } catch (error) {
      console.error('Error processing feature match:', error)
      return bestFeature.description || "I can help with that feature!"
    }
  }
  
    // Check for product info
    if (normalizedQuery.includes('what is') || normalizedQuery.includes("what's") || normalizedQuery.includes('about leadmap')) {
      try {
        const knowledge = getKnowledge()
        const productDesc = knowledge?.product?.description || "LeadMap is a real estate lead generation platform."
        const productTagline = knowledge?.product?.tagline || "The AI lead platform for faster, smarter closings"
        return addConversationalFlair(
          `${productDesc} ${productTagline}`,
          true
        )
      } catch (e) {
        console.error('Error with product info:', e)
        return "LeadMap is a real estate lead generation platform. The AI lead platform for faster, smarter closings."
      }
    }
    
    // Fallback response
    try {
      const knowledge = getKnowledge()
      if (knowledge.responses?.fallback && Array.isArray(knowledge.responses.fallback) && knowledge.responses.fallback.length > 0) {
        return randomElement(knowledge.responses.fallback)
      }
    } catch (e) {
      console.error('Error selecting fallback:', e)
    }
    return "I'm not sure about that, but I'm here to help with LeadMap questions! Try asking about features, pricing, or how to use the platform."
  } catch (error) {
    console.error('Error in getAssistantResponse:', error)
    console.error('Query was:', query)
    return "I encountered an error processing your question. Please try rephrasing it or ask about LeadMap features, pricing, or how to use the platform."
  }
}

/**
 * Store conversation in memory
 */
export function storeMemory(sessionId: string, userMessage: string, assistantResponse: string) {
  const sessionMem = sessionMemory.get(sessionId) || []
  sessionMem.push({
    user: userMessage,
    assistant: assistantResponse,
    timestamp: Date.now()
  })
  
  // Keep only last 3 exchanges
  if (sessionMem.length > 3) {
    sessionMem.shift()
  }
  
  sessionMemory.set(sessionId, sessionMem)
}

/**
 * Get memory for a session
 */
export function getMemory(sessionId: string): MemoryEntry[] {
  return sessionMemory.get(sessionId) || []
}
