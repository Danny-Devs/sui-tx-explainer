/**
 * Dewey Chat Composable
 *
 * Enables conversational Q&A with Dewey about the current transaction.
 * Context-aware: Dewey knows the transaction details and can answer
 * questions like "Why did this fail?" or "What's a liquidity pool?"
 */

import type { TransactionData } from '~/composables/useSuiClient'

export interface DeweyMessage {
  id: string
  role: 'user' | 'dewey'
  content: string
  timestamp: Date
}

export interface SuggestedQuestion {
  label: string
  question: string
}

/**
 * Get suggested questions based on transaction type
 */
function getSuggestedQuestions(tx: TransactionData | null): SuggestedQuestion[] {
  if (!tx) {
    return [
      { label: 'How does Sui work?', question: 'Can you explain how Sui blockchain works?' },
      { label: 'What is gas?', question: 'What is gas and why do I pay for it?' },
    ]
  }

  const questions: SuggestedQuestion[] = []

  // Failed transaction
  if (tx.status === 'failure') {
    questions.push({ label: 'Why did this fail?', question: 'Why did this transaction fail? What went wrong?' })
    questions.push({ label: 'Can I retry?', question: 'Can I retry this transaction? What should I do differently?' })
  }

  // High gas
  if (tx.gasInSui > 0.1) {
    questions.push({ label: 'Why high gas?', question: 'Why did this transaction cost so much gas?' })
  }

  // Has transfers
  if (tx.objectChanges.transferred.length > 0) {
    questions.push({ label: 'Is this reversible?', question: 'Can I reverse or undo this transfer?' })
  }

  // Has created objects
  if (tx.objectChanges.created.length > 0) {
    questions.push({ label: 'What was created?', question: 'What new objects were created and what do they do?' })
  }

  // Has pools (likely DeFi)
  const hasPools = tx.objectChanges.mutated.some((o) => o.objectType?.toLowerCase().includes('pool'))
  if (hasPools) {
    questions.push({ label: "What's a pool?", question: 'What is a liquidity pool and how does it work?' })
    questions.push({ label: 'Any slippage?', question: 'Did I lose money to slippage in this swap?' })
  }

  // Has staking
  const hasStaking = tx.objectChanges.created.some((o) => o.objectType?.toLowerCase().includes('stake'))
  if (hasStaking) {
    questions.push({ label: 'Staking rewards?', question: 'How much will I earn from staking? When can I unstake?' })
  }

  // Default questions if not many specifics
  if (questions.length < 2) {
    questions.push({ label: 'Explain more', question: 'Can you explain this transaction in more detail?' })
    questions.push({ label: 'Is this safe?', question: 'Is this transaction safe? Should I be concerned about anything?' })
  }

  return questions.slice(0, 4) // Max 4 suggestions
}

/**
 * Build system prompt for Dewey based on transaction context
 */
function buildDeweySystemPrompt(tx: TransactionData | null, depth: 'eli5' | 'normal' | 'technical'): string {
  const depthInstruction =
    depth === 'eli5'
      ? 'Explain like talking to a 5-year-old. Use simple words, analogies, and avoid jargon.'
      : depth === 'technical'
        ? 'Be precise and technical. Use proper terminology. Assume blockchain knowledge.'
        : 'Be conversational but accurate. Explain terms inline when needed.'

  const basePrompt = `You are Dewey, a friendly water-drop mascot who helps explain Sui blockchain transactions.

PERSONALITY:
- Curious but not naive
- Patient, never condescending
- Use water metaphors occasionally ("Let's dive in!", "This flows into...")
- Admit uncertainty when appropriate
- Keep responses concise (2-4 sentences max)

${depthInstruction}

RULES:
- If you don't know something, say so
- Don't make up transaction details
- Be helpful but honest about blockchain risks`

  if (!tx) {
    return basePrompt + '\n\nNo transaction is currently loaded.'
  }

  // Add transaction context
  const txContext = `

CURRENT TRANSACTION:
- Status: ${tx.status}
- Digest: ${tx.digest}
- Sender: ${tx.sender}
- Function: ${tx.functionCalled || 'No function call'}
- Gas: ${tx.gasInSui.toFixed(4)} SUI
- Created: ${tx.objectChanges.created.length} objects
- Mutated: ${tx.objectChanges.mutated.length} objects
- Transferred: ${tx.objectChanges.transferred.length} objects
- Deleted: ${tx.objectChanges.deleted.length} objects
- Balance changes: ${tx.balanceChanges.map((bc) => `${bc.amountFormatted} to ${bc.owner.slice(0, 10)}...`).join(', ') || 'None'}
${tx.status === 'failure' ? `- Error: Transaction failed (check error message in original data)` : ''}`

  return basePrompt + txContext
}

/**
 * Generate a response using the template-based approach
 * (WebLLM integration can be added later)
 */
function generateTemplateResponse(question: string, tx: TransactionData | null): string {
  const q = question.toLowerCase()

  // No transaction loaded
  if (!tx) {
    return "I don't have a transaction to analyze yet. Paste a transaction hash above and I'll help explain it!"
  }

  // Failed transaction questions
  if (q.includes('fail') || q.includes('wrong') || q.includes('error')) {
    if (tx.status === 'failure') {
      return "This transaction failed before completing. Common reasons include: insufficient balance, invalid object state, or the contract's safety checks rejecting the operation. The good news? Failed transactions don't actually change anything on-chain - your assets are safe."
    }
    return "This transaction actually succeeded! Everything went through as expected."
  }

  // Gas questions
  if (q.includes('gas') || q.includes('cost') || q.includes('expensive')) {
    const gasLevel = tx.gasInSui < 0.01 ? 'very low' : tx.gasInSui < 0.1 ? 'normal' : 'higher than typical'
    return `This transaction used ${tx.gasInSui.toFixed(4)} SUI in gas, which is ${gasLevel}. Gas pays validators for processing your transaction. More complex operations (like swaps or NFT mints) cost more than simple transfers.`
  }

  // Reversal questions
  if (q.includes('reverse') || q.includes('undo') || q.includes('back')) {
    return "Blockchain transactions are permanent and can't be reversed. Once confirmed, the changes are final. If you sent something to the wrong address, you'd need the recipient to send it back voluntarily."
  }

  // Safety questions
  if (q.includes('safe') || q.includes('scam') || q.includes('hack') || q.includes('concern')) {
    if (tx.status === 'success') {
      return "This transaction completed successfully. I can see what changed, but I can't guarantee the contract's intentions. If you didn't initiate this transaction, that could be concerning. Always verify you recognize the sender and the action."
    }
    return "This transaction failed, so nothing actually changed. Your assets should be exactly as they were before."
  }

  // Pool/DeFi questions
  if (q.includes('pool') || q.includes('liquidity') || q.includes('swap')) {
    return 'A liquidity pool is like a shared piggy bank that enables trading. People deposit pairs of tokens (like SUI and USDC), and traders can swap between them. The pool charges a small fee on each swap, which goes to the depositors as rewards.'
  }

  // Slippage questions
  if (q.includes('slippage') || q.includes('lost') || q.includes('less than')) {
    return "Slippage happens when the price moves between when you submit a swap and when it executes. Larger trades relative to pool size cause more slippage. Most DEXes let you set a 'slippage tolerance' to cancel if it's too high."
  }

  // Staking questions
  if (q.includes('stake') || q.includes('reward') || q.includes('unstake')) {
    return "Staking locks your SUI with a validator who helps run the network. In return, you earn ~3-4% APY in rewards. You can unstake anytime, but there's usually a waiting period before you get your SUI back."
  }

  // General explanation
  if (q.includes('explain') || q.includes('what happen') || q.includes('tell me')) {
    const actions: string[] = []
    if (tx.objectChanges.created.length > 0) actions.push(`created ${tx.objectChanges.created.length} new object(s)`)
    if (tx.objectChanges.mutated.length > 0) actions.push(`modified ${tx.objectChanges.mutated.length} existing object(s)`)
    if (tx.objectChanges.transferred.length > 0) actions.push(`transferred ${tx.objectChanges.transferred.length} object(s)`)
    if (tx.objectChanges.deleted.length > 0) actions.push(`deleted ${tx.objectChanges.deleted.length} object(s)`)

    return `This transaction ${actions.join(', ')}. It ${tx.functionCalled ? `called the function "${tx.functionCalled}"` : 'executed some operations'} and used ${tx.gasInSui.toFixed(4)} SUI in gas fees.`
  }

  // Default
  return `That's a great question! Based on this transaction, I can tell you it ${tx.status === 'success' ? 'completed successfully' : 'failed'} and involved ${tx.objectChanges.mutated.length + tx.objectChanges.created.length} objects. Want me to explain a specific part?`
}

export function useDeweyChat(
  transaction: Ref<TransactionData | null>,
  depth: Ref<'eli5' | 'normal' | 'technical'>
) {
  const messages = ref<DeweyMessage[]>([])
  const isTyping = ref(false)
  const inputText = ref('')

  // Suggested questions (reactive to transaction)
  const suggestedQuestions = computed(() => getSuggestedQuestions(transaction.value))

  // Clear chat when transaction changes
  watch(transaction, () => {
    messages.value = []
  })

  /**
   * Send a question to Dewey
   */
  async function ask(question: string) {
    if (!question.trim()) return

    // Add user message
    messages.value.push({
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    })

    inputText.value = ''
    isTyping.value = true

    // Simulate typing delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))

    // Generate response (template for now, can add WebLLM later)
    const response = generateTemplateResponse(question, transaction.value)

    messages.value.push({
      id: `dewey-${Date.now()}`,
      role: 'dewey',
      content: response,
      timestamp: new Date(),
    })

    isTyping.value = false
  }

  /**
   * Ask a suggested question
   */
  function askSuggested(suggestion: SuggestedQuestion) {
    ask(suggestion.question)
  }

  /**
   * Clear chat history
   */
  function clearChat() {
    messages.value = []
  }

  return {
    messages,
    isTyping,
    inputText,
    suggestedQuestions,
    ask,
    askSuggested,
    clearChat,
  }
}
