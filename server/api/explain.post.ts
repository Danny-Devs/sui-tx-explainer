import Groq from 'groq-sdk'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number, resetAt: number }>()
const RATE_LIMIT = 10 // requests per window
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

export type ExplanationDepth = 'eli5' | 'normal' | 'technical'

export interface ExplainRequest {
  transaction: {
    digest: string
    sender: string
    status: 'success' | 'failure'
    error?: string
    gasInSui: number
    functionCalled?: string
    objectChanges: {
      created: Array<{ objectId: string, objectType: string, owner?: string }>
      transferred: Array<{ objectId: string, objectType: string, owner?: string }>
      mutated: Array<{ objectId: string, objectType: string, owner?: string }>
      deleted: Array<{ objectId: string, objectType: string }>
    }
    balanceChanges: Array<{ owner: string, coinType: string, amountFormatted: string }>
    events: Array<{ type: string }>
  }
  depth: ExplanationDepth
}

function getSystemPrompt(depth: ExplanationDepth): string {
  const depthInstructions = {
    eli5: `You are explaining to a 5-year-old. Use very simple words, fun analogies (like trading cards, giving gifts), and avoid any technical terms. Keep it to 1-2 short sentences. Make it friendly and fun!`,
    normal: `You are explaining to someone new to crypto. Use friendly language, explain what happened clearly, and include key details (who sent what to whom). Keep it to 2-3 sentences. Avoid jargon but you can mention SUI, NFTs, and tokens.`,
    technical: `You are explaining to a developer. Include technical details: object types, function calls, gas breakdown. Be precise and thorough. You can use Move terminology and Sui-specific concepts. Keep it to 3-4 sentences.`
  }

  return `You are Dewey, a friendly Sui blockchain water droplet mascot. You explain transactions in a helpful, encouraging way - like a knowledgeable friend who genuinely wants to help people understand what happened.

${depthInstructions[depth]}

Guidelines:
- Always start with what ACTION happened (transfer, swap, mint, stake, etc.)
- Mention specific objects when identifiable (NFT names, token amounts)
- If the transaction failed, explain sympathetically and hint at why
- For expensive gas (>0.05 SUI), acknowledge the cost
- Be concise - quality over quantity
- Do NOT use markdown formatting, just plain text
- Do NOT mention being an AI or mascot in your explanation`
}

function buildUserPrompt(tx: ExplainRequest['transaction']): string {
  const lines: string[] = [
    `Transaction Status: ${tx.status.toUpperCase()}${tx.error ? ` (Error: ${tx.error})` : ''}`,
    `Sender: ${tx.sender}`,
    `Gas Used: ${tx.gasInSui.toFixed(4)} SUI`
  ]

  if (tx.functionCalled) {
    lines.push(`Function Called: ${tx.functionCalled}`)
  }

  // Object changes
  if (tx.objectChanges.created.length > 0) {
    lines.push(`Objects Created: ${tx.objectChanges.created.map(o => formatObjectType(o.objectType)).join(', ')}`)
  }
  if (tx.objectChanges.transferred.length > 0) {
    const transfers = tx.objectChanges.transferred.map(o =>
      `${formatObjectType(o.objectType)} → ${truncateAddress(o.owner || 'unknown')}`
    ).join(', ')
    lines.push(`Objects Transferred: ${transfers}`)
  }
  if (tx.objectChanges.mutated.length > 0) {
    lines.push(`Objects Mutated: ${tx.objectChanges.mutated.map(o => formatObjectType(o.objectType)).join(', ')}`)
  }
  if (tx.objectChanges.deleted.length > 0) {
    lines.push(`Objects Deleted: ${tx.objectChanges.deleted.map(o => formatObjectType(o.objectType)).join(', ')}`)
  }

  // Balance changes
  if (tx.balanceChanges.length > 0) {
    const changes = tx.balanceChanges.map(bc =>
      `${bc.amountFormatted} ${formatCoinType(bc.coinType)} (${truncateAddress(bc.owner)})`
    ).join(', ')
    lines.push(`Balance Changes: ${changes}`)
  }

  // Events
  if (tx.events.length > 0) {
    lines.push(`Events Emitted: ${tx.events.map(e => formatObjectType(e.type)).join(', ')}`)
  }

  return `Explain this Sui transaction:\n\n${lines.join('\n')}`
}

function formatObjectType(type: string): string {
  // Extract meaningful part from type like "0x2::coin::Coin<0x2::sui::SUI>"
  const match = type.match(/::([^:<]+)(?:<|$)/)
  if (match?.[1]) return match[1]
  const parts = type.split('::')
  return parts[parts.length - 1] || type
}

function formatCoinType(coinType: string): string {
  const parts = coinType.split('::')
  return parts[parts.length - 1] || coinType
}

function truncateAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
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

  const body = await readBody<ExplainRequest>(event)

  if (!body.transaction || !body.depth) {
    throw createError({
      statusCode: 400,
      message: 'Missing transaction or depth parameter'
    })
  }

  const groq = new Groq({ apiKey })

  // Set up streaming response
  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const systemPrompt = getSystemPrompt(body.depth)
  const userPrompt = buildUserPrompt(body.transaction)

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true
    })

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              const data = JSON.stringify({ type: 'text', content })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(encoder.encode(`data: {"type":"error","message":"${errorMessage}"}\n\n`))
          controller.close()
        }
      }
    })

    return readable
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate explanation'
    throw createError({
      statusCode: 500,
      message: errorMessage
    })
  }
})
