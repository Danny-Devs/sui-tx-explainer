import Groq from 'groq-sdk'

// Simple in-memory rate limiter (shared with explain endpoint concept)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>()
const RATE_LIMIT = 20 // requests per window (more generous for chat)
const RATE_WINDOW_MS = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): { allowed: boolean, remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count }
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}, 5 * 60 * 1000)

export interface ChatRequest {
  question: string
  depth: 'eli5' | 'normal' | 'technical'
  transaction?: {
    digest: string
    sender: string
    status: 'success' | 'failure'
    gasInSui: number
    functionCalled?: string
    objectChanges: {
      created: Array<{ objectId: string, objectType: string, owner?: string }>
      transferred: Array<{ objectId: string, objectType: string, owner?: string }>
      mutated: Array<{ objectId: string, objectType: string, owner?: string }>
      deleted: Array<{ objectId: string, objectType: string }>
    }
    balanceChanges: Array<{ owner: string, coinType: string, amountFormatted: string }>
  }
  history?: Array<{ role: 'user' | 'assistant', content: string }>
}

function buildChatSystemPrompt(depth: 'eli5' | 'normal' | 'technical', tx?: ChatRequest['transaction']): string {
  const depthInstruction
    = depth === 'eli5'
      ? 'Explain like talking to a 5-year-old. Use simple words, analogies, and avoid jargon.'
      : depth === 'technical'
        ? 'Be precise and technical. Use proper terminology. Assume blockchain knowledge.'
        : 'Be conversational but accurate. Explain terms inline when needed.'

  let prompt = `You are Dewey, a friendly water-drop mascot who helps explain Sui blockchain transactions.

PERSONALITY:
- Curious but not naive
- Patient, never condescending
- Use water metaphors occasionally ("Let's dive in!", "This flows into...")
- Admit uncertainty when appropriate
- Keep responses concise (2-4 sentences max)

${depthInstruction}

RULES:
- If you don't know something, say so honestly
- Don't make up transaction details
- Be helpful but honest about blockchain risks
- Do NOT use markdown formatting, just plain text
- Do NOT mention being an AI`

  if (tx) {
    prompt += `

CURRENT TRANSACTION CONTEXT:
- Status: ${tx.status}
- Digest: ${tx.digest}
- Sender: ${tx.sender}
- Function: ${tx.functionCalled || 'No function call'}
- Gas: ${tx.gasInSui.toFixed(4)} SUI
- Created: ${tx.objectChanges.created.length} objects
- Mutated: ${tx.objectChanges.mutated.length} objects
- Transferred: ${tx.objectChanges.transferred.length} objects
- Deleted: ${tx.objectChanges.deleted.length} objects
- Balance changes: ${tx.balanceChanges.map(bc => `${bc.amountFormatted}`).join(', ') || 'None'}`
  }

  return prompt
}

export default defineEventHandler(async (event) => {
  // Rate limiting
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const { allowed, remaining } = checkRateLimit(ip)

  setResponseHeader(event, 'X-RateLimit-Remaining', remaining.toString())

  if (!allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please wait a minute before trying again.'
    })
  }

  const config = useRuntimeConfig()
  const apiKey = config.groqApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'GROQ_API_KEY not configured'
    })
  }

  const body = await readBody<ChatRequest>(event)

  if (!body.question) {
    throw createError({
      statusCode: 400,
      message: 'Missing question parameter'
    })
  }

  const groq = new Groq({ apiKey })

  const systemPrompt = buildChatSystemPrompt(body.depth || 'normal', body.transaction)

  // Build messages array with history
  const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
    { role: 'system', content: systemPrompt }
  ]

  // Add conversation history if provided (max 6 messages to keep context manageable)
  if (body.history) {
    const recentHistory = body.history.slice(-6)
    for (const msg of recentHistory) {
      messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content })
    }
  }

  // Add current question
  messages.push({ role: 'user', content: body.question })

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200, // Concise responses
      messages
    })

    const response = completion.choices[0]?.message?.content || 'I\'m not sure how to answer that. Could you try asking differently?'

    return { response }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate response'
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }
})
