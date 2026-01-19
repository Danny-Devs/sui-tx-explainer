import type { TransactionData } from './useSuiClient'

export type ExplanationDepth = 'eli5' | 'normal' | 'technical'

// Smart fallback: Generate explanation without AI
function generateFallbackExplanation(tx: TransactionData, depth: ExplanationDepth): string {
  const action = tx.functionCalled || 'perform an action'
  const status = tx.status === 'success' ? 'successfully completed' : 'failed'
  const created = tx.objectChanges.created.length
  const mutated = tx.objectChanges.mutated.length
  const transferred = tx.objectChanges.transferred.length
  const deleted = tx.objectChanges.deleted.length

  if (depth === 'eli5') {
    let msg = `Someone ${status === 'successfully completed' ? 'did something on Sui' : 'tried to do something but it didn\'t work'}! `
    if (created > 0) msg += `They made ${created} new thing${created > 1 ? 's' : ''}. `
    if (transferred > 0) msg += `They sent ${transferred} thing${transferred > 1 ? 's' : ''} to someone else. `
    if (mutated > 0) msg += `They changed ${mutated} thing${mutated > 1 ? 's' : ''}. `
    msg += `It cost ${tx.gasInSui.toFixed(4)} SUI in fees.`
    return msg
  }

  if (depth === 'technical') {
    return `Transaction ${tx.digest.slice(0, 8)}... ${status}. ` +
      `Called ${action}. ` +
      `Object mutations: ${created} created, ${mutated} mutated, ${transferred} transferred, ${deleted} deleted. ` +
      `Balance changes: ${tx.balanceChanges.length}. ` +
      `Gas consumed: ${tx.gasInSui.toFixed(6)} SUI (computation + storage - rebate).`
  }

  // Normal depth
  let msg = `This transaction ${status}. `
  if (tx.functionCalled) {
    msg += `It called the "${action}" function. `
  }
  if (created > 0) msg += `${created} new object${created > 1 ? 's were' : ' was'} created. `
  if (transferred > 0) msg += `${transferred} object${transferred > 1 ? 's were' : ' was'} transferred. `
  if (mutated > 0) msg += `${mutated} object${mutated > 1 ? 's were' : ' was'} modified. `
  if (deleted > 0) msg += `${deleted} object${deleted > 1 ? 's were' : ' was'} deleted. `
  msg += `The transaction cost ${tx.gasInSui.toFixed(4)} SUI in gas fees.`
  return msg
}

// Build prompt for AI (exported for WebLLM use)
export function buildExplainPrompt(tx: TransactionData, depth: ExplanationDepth): string {
  const depthInstructions = {
    eli5: 'Explain this like I\'m 5 years old. Use very simple words and analogies.',
    normal: 'Explain this clearly for someone who knows basic crypto but not Sui specifics.',
    technical: 'Give a technical explanation for a developer familiar with blockchain.'
  }

  return `${depthInstructions[depth]}

Transaction Details:
- Status: ${tx.status}
- Function Called: ${tx.functionCalled || 'None specified'}
- Sender: ${tx.sender}
- Objects Created: ${tx.objectChanges.created.length}
- Objects Transferred: ${tx.objectChanges.transferred.length}
- Objects Modified: ${tx.objectChanges.mutated.length}
- Objects Deleted: ${tx.objectChanges.deleted.length}
- Balance Changes: ${tx.balanceChanges.map(bc => `${bc.amountFormatted} ${bc.coinType.split('::').pop()}`).join(', ') || 'None'}
- Gas Used: ${tx.gasInSui.toFixed(4)} SUI

Explain what happened in this Sui blockchain transaction in 2-3 sentences.`
}

export function useExplainer() {
  const explanation = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const depth = ref<ExplanationDepth>('normal')

  // Generate template-based explanation
  function explainWithTemplate(transaction: TransactionData): void {
    explanation.value = generateFallbackExplanation(transaction, depth.value)
  }

  // Set explanation directly (for WebLLM streaming)
  function setExplanation(text: string): void {
    explanation.value = text
  }

  // Append to explanation (for streaming)
  function appendExplanation(text: string): void {
    explanation.value += text
  }

  function setLoading(isLoading: boolean): void {
    loading.value = isLoading
  }

  function setError(errorMessage: string | null): void {
    error.value = errorMessage
  }

  function setDepth(newDepth: ExplanationDepth): void {
    depth.value = newDepth
  }

  function clear(): void {
    explanation.value = ''
    error.value = null
  }

  return {
    explanation,
    loading,
    error,
    depth: readonly(depth),
    explainWithTemplate,
    setExplanation,
    appendExplanation,
    setLoading,
    setError,
    setDepth,
    clear
  }
}
