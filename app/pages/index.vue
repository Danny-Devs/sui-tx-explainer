<script setup lang="ts">
import { buildExplainPrompt } from '~/composables/useExplainer'

const { network, loading, error, transaction, fetchTransaction, clearError } = useSuiClient()
const {
  explanation,
  loading: explainLoading,
  error: explainError,
  depth,
  explainWithTemplate,
  appendExplanation,
  setLoading: setExplainLoading,
  setError: setExplainError,
  setDepth,
  clear: clearExplanation
} = useExplainer()

// WebLLM state - only on client
const webLLMEnabled = ref(false)
const showWebLLMSetup = ref(false)

// Lazy WebLLM access (client-only)
let webLLM: ReturnType<typeof useWebLLM> | null = null
function getWebLLM() {
  if (import.meta.client && !webLLM) {
    webLLM = useWebLLM()
  }
  return webLLM
}

// WebLLM reactive state
const webLLMStatus = computed(() => getWebLLM()?.status.value || 'idle')
const webLLMProgress = computed(() => getWebLLM()?.progress.value || { phase: 'init' as const, progress: 0, text: '' })
const webLLMError = computed(() => getWebLLM()?.error.value || null)

// Main explain function - coordinates template vs WebLLM
async function explain(tx: typeof transaction.value) {
  if (!tx) return

  clearExplanation()
  setExplainLoading(true)

  try {
    const llm = getWebLLM()
    if (webLLMEnabled.value && llm && llm.status.value === 'ready') {
      // Use WebLLM with streaming
      const prompt = buildExplainPrompt(tx, depth.value)
      for await (const chunk of llm.generateStream(prompt)) {
        appendExplanation(chunk)
      }
    } else {
      // Use template fallback
      explainWithTemplate(tx)
    }
  } catch (e) {
    console.warn('Explanation failed, using template:', e)
    explainWithTemplate(tx)
    if (webLLMEnabled.value) {
      setExplainError(e instanceof Error ? e.message : 'AI generation failed')
    }
  } finally {
    setExplainLoading(false)
  }
}

async function handleEnableWebLLM() {
  showWebLLMSetup.value = true
  const llm = getWebLLM()
  if (!llm) return

  const success = await llm.initialize()
  if (success) {
    webLLMEnabled.value = true
    showWebLLMSetup.value = false
    // Re-explain with AI if we have a transaction
    if (transaction.value) {
      await explain(transaction.value)
    }
  }
}

function handleCancelWebLLM() {
  showWebLLMSetup.value = false
  webLLMEnabled.value = false
}

async function handleRetryWebLLM() {
  const llm = getWebLLM()
  if (llm) {
    llm.reset()
    await handleEnableWebLLM()
  }
}

const txInput = ref('')
const hasSearched = ref(false)

async function handleExplain() {
  if (!txInput.value.trim()) return
  hasSearched.value = true
  clearExplanation()
  const tx = await fetchTransaction(txInput.value)
  if (tx) {
    // Auto-generate explanation after fetching
    await explain(tx)
  }
}

async function handleDepthChange(newDepth: 'eli5' | 'normal' | 'technical') {
  setDepth(newDepth)
  if (transaction.value) {
    clearExplanation()
    await explain(transaction.value)
  }
}

function handlePaste(event: ClipboardEvent) {
  // Auto-submit on paste
  const pastedText = event.clipboardData?.getData('text')
  if (pastedText && (pastedText.length === 44 || pastedText.includes('suiscan') || pastedText.includes('suivision'))) {
    txInput.value = pastedText
    nextTick(() => handleExplain())
  }
}

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

function formatObjectType(type: string): string {
  // Extract meaningful part from type like "0x2::coin::Coin<0x2::sui::SUI>"
  const match = type.match(/::([^:]+)(?:<|$)/)
  if (match?.[1]) return match[1]
  const parts = type.split('::')
  return parts[parts.length - 1] || type
}

function getObjectIcon(type: string): string {
  const typeLower = type.toLowerCase()
  if (typeLower.includes('coin')) return '💰'
  if (typeLower.includes('nft') || typeLower.includes('suifren') || typeLower.includes('capy')) return '🖼️'
  if (typeLower.includes('stake')) return '🔒'
  return '📦'
}

// Dewey the mascot - expression based on transaction and explanation state
const mascotExpression = computed(() => {
  if (loading.value) return { face: '(◕.◕)?', message: 'Dewey is fetching...' }
  if (explainLoading.value) return { face: '(◕.◕)...', message: 'Dewey is thinking...' }
  if (error.value) return { face: '(◕︵◕)', message: 'Hmm, something went wrong...' }
  if (explainError.value) return { face: '(◕︵◕)', message: 'Dewey had trouble with that one...' }
  if (!transaction.value) return { face: '(◕‿◕)', message: 'Hi! I\'m Dewey. Paste a transaction hash!' }

  const tx = transaction.value
  if (tx.status === 'failure') return { face: '(◕︵◕)', message: null }
  if (tx.gasInSui > 0.1) return { face: '(◕﹏◕)💦', message: null }
  if (tx.objectChanges.transferred.length > 0) return { face: '(◕ᴗ◕)✧', message: null }
  return { face: '(◕‿◕)', message: null }
})

// Depth labels for the toggle
const depthLabels = {
  eli5: 'ELI5',
  normal: 'Normal',
  technical: 'Technical'
}

function copyToClipboard(text: string): void {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}
</script>

<template>
  <UContainer class="py-4">
      <!-- Search bar with network toggle -->
      <div class="max-w-3xl mx-auto mb-4">
        <div class="flex items-center gap-2">
          <UInput
            v-model="txInput"
            placeholder="Paste transaction hash or Suiscan link..."
            size="lg"
            class="flex-1 font-mono text-sm"
            @paste="handlePaste"
            @keydown.enter="handleExplain"
          />
          <UButton
            size="lg"
            :loading="loading"
            @click="handleExplain"
          >
            Explain
          </UButton>
          <div class="inline-flex rounded-md border border-gray-600 ml-8">
            <UButton
              :color="network === 'mainnet' ? 'primary' : 'neutral'"
              :variant="network === 'mainnet' ? 'soft' : 'ghost'"
              size="sm"
              class="rounded-r-none border-0"
              @click="network = 'mainnet'"
            >
              Mainnet
            </UButton>
            <UButton
              :color="network === 'testnet' ? 'warning' : 'neutral'"
              :variant="network === 'testnet' ? 'soft' : 'ghost'"
              size="sm"
              class="rounded-l-none border-0"
              @click="network = 'testnet'"
            >
              Testnet
            </UButton>
          </div>
        </div>
      </div>

    <!-- Error State (dismissible) -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      class="max-w-2xl mx-auto mb-4"
      :title="error"
      icon="i-heroicons-exclamation-triangle"
      :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
      @close="clearError"
    />

    <!-- Results -->
    <div
      v-if="transaction"
      class="max-w-6xl mx-auto space-y-4"
    >
      <!-- Status Header - compact -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UBadge
            :color="transaction.status === 'success' ? 'success' : 'error'"
            size="sm"
          >
            {{ transaction.status === 'success' ? '✓ SUCCESS' : '✗ FAILED' }}
          </UBadge>
          <span
            v-if="transaction.timestamp"
            class="text-muted text-xs"
          >
            {{ transaction.timestamp.toLocaleDateString() }}
            {{ transaction.timestamp.toLocaleTimeString() }}
          </span>
        </div>
        <UButton
          size="xs"
          variant="ghost"
          icon="i-heroicons-document-duplicate"
          @click="copyToClipboard(transaction.digest)"
        >
          Copy Hash
        </UButton>
      </div>

      <!-- Flow Diagram - THE KING (full width) -->
      <ClientOnly>
        <FlowTxFlowDiagram :transaction="transaction" :network="network" />
        <template #fallback>
          <div class="h-[500px] rounded-xl bg-gray-900 flex items-center justify-center">
            <div class="text-gray-500">Loading visualization...</div>
          </div>
        </template>
      </ClientOnly>

      <!-- Explanation Panel (below diagram) -->
      <UCard>
        <div class="flex items-start gap-3">
          <div class="text-3xl flex-shrink-0" style="transform: rotate(15deg)">💧</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <p class="text-xl font-mono">{{ mascotExpression.face }}</p>
              <div class="flex-1" />
              <div class="inline-flex rounded-md shadow-sm">
                <UButton
                  :color="depth === 'eli5' ? 'primary' : 'neutral'"
                  :variant="depth === 'eli5' ? 'solid' : 'ghost'"
                  size="xs"
                  class="rounded-r-none"
                  @click="handleDepthChange('eli5')"
                >
                  ELI5
                </UButton>
                <UButton
                  :color="depth === 'normal' ? 'primary' : 'neutral'"
                  :variant="depth === 'normal' ? 'solid' : 'ghost'"
                  size="xs"
                  class="rounded-none -ml-px"
                  @click="handleDepthChange('normal')"
                >
                  Normal
                </UButton>
                <UButton
                  :color="depth === 'technical' ? 'primary' : 'neutral'"
                  :variant="depth === 'technical' ? 'solid' : 'ghost'"
                  size="xs"
                  class="rounded-l-none -ml-px"
                  @click="handleDepthChange('technical')"
                >
                  Technical
                </UButton>
              </div>
            </div>

            <!-- AI Explanation -->
            <div
              v-if="explainLoading"
              class="text-sm text-muted animate-pulse"
            >
              {{ mascotExpression.message || 'Thinking...' }}
            </div>
            <div
              v-else-if="explainError"
              class="text-sm text-red-400"
            >
              {{ explainError }}
            </div>
            <div v-else-if="explanation">
              <p class="text-sm leading-relaxed">
                {{ explanation }}
              </p>
              <p v-if="!webLLMEnabled" class="text-xs text-gray-500 mt-2 italic">
                (Basic mode)
                <button
                  class="ml-2 text-blue-400 hover:text-blue-300 underline"
                  @click="handleEnableWebLLM"
                >
                  Enable AI for better explanations
                </button>
              </p>
              <p v-else class="text-xs text-green-500 mt-2 italic">
                (AI-powered explanation)
              </p>
            </div>
            <p
              v-else
              class="text-sm text-muted"
            >
              {{ mascotExpression.message || 'Generating explanation...' }}
            </p>

            <!-- Quick Summary -->
            <div class="mt-3 pt-3 border-t border-muted/20 space-y-1 text-xs text-muted">
              <p>
                <strong>From:</strong>
                <code class="text-xs">{{ truncateAddress(transaction.sender) }}</code>
              </p>
              <p v-if="transaction.functionCalled">
                <strong>Action:</strong> {{ transaction.functionCalled }}
              </p>
              <p>
                <strong>Gas:</strong> {{ transaction.gasInSui.toFixed(4) }} SUI
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Object Changes -->
      <UAccordion
        :items="[
          {
            label: `Objects Changed (${transaction.objectChanges.created.length + transaction.objectChanges.mutated.length + transaction.objectChanges.transferred.length + transaction.objectChanges.deleted.length})`,
            slot: 'objects'
          },
          {
            label: `Balance Changes (${transaction.balanceChanges.length})`,
            slot: 'balances'
          },
          {
            label: `Events (${transaction.events.length})`,
            slot: 'events'
          }
        ]"
      >
        <template #objects>
          <div class="space-y-4 p-4">
            <!-- Created -->
            <div v-if="transaction.objectChanges.created.length">
              <h4 class="font-semibold text-green-500 mb-2">
                Created
              </h4>
              <div
                v-for="obj in transaction.objectChanges.created"
                :key="obj.objectId"
                class="flex items-center gap-2 text-sm"
              >
                <span>{{ getObjectIcon(obj.objectType) }}</span>
                <span>{{ formatObjectType(obj.objectType) }}</span>
                <code class="text-xs text-muted">{{ truncateAddress(obj.objectId) }}</code>
              </div>
            </div>

            <!-- Transferred -->
            <div v-if="transaction.objectChanges.transferred.length">
              <h4 class="font-semibold text-blue-500 mb-2">
                Transferred
              </h4>
              <div
                v-for="obj in transaction.objectChanges.transferred"
                :key="obj.objectId"
                class="flex items-center gap-2 text-sm"
              >
                <span>{{ getObjectIcon(obj.objectType) }}</span>
                <span>{{ formatObjectType(obj.objectType) }}</span>
                <span class="text-muted">→</span>
                <code class="text-xs text-muted">{{ truncateAddress(obj.owner || '') }}</code>
              </div>
            </div>

            <!-- Mutated -->
            <div v-if="transaction.objectChanges.mutated.length">
              <h4 class="font-semibold text-amber-500 mb-2">
                Mutated
              </h4>
              <div
                v-for="obj in transaction.objectChanges.mutated"
                :key="obj.objectId"
                class="flex items-center gap-2 text-sm"
              >
                <span>{{ getObjectIcon(obj.objectType) }}</span>
                <span>{{ formatObjectType(obj.objectType) }}</span>
                <code class="text-xs text-muted">{{ truncateAddress(obj.objectId) }}</code>
              </div>
            </div>

            <!-- Deleted -->
            <div v-if="transaction.objectChanges.deleted.length">
              <h4 class="font-semibold text-red-500 mb-2">
                Deleted
              </h4>
              <div
                v-for="obj in transaction.objectChanges.deleted"
                :key="obj.objectId"
                class="flex items-center gap-2 text-sm"
              >
                <span>{{ getObjectIcon(obj.objectType) }}</span>
                <span>{{ formatObjectType(obj.objectType) }}</span>
                <code class="text-xs text-muted">{{ truncateAddress(obj.objectId) }}</code>
              </div>
            </div>

            <p
              v-if="!transaction.objectChanges.created.length && !transaction.objectChanges.transferred.length && !transaction.objectChanges.mutated.length && !transaction.objectChanges.deleted.length"
              class="text-muted"
            >
              No object changes in this transaction.
            </p>
          </div>
        </template>

        <template #balances>
          <div class="space-y-2 p-4">
            <div
              v-for="(bc, i) in transaction.balanceChanges"
              :key="i"
              class="flex items-center gap-2 text-sm"
            >
              <span :class="bc.amount > 0n ? 'text-green-500' : 'text-red-500'">
                {{ bc.amount > 0n ? '+' : '' }}{{ bc.amountFormatted }}
              </span>
              <span class="text-muted">{{ formatObjectType(bc.coinType) }}</span>
              <span class="text-muted">→</span>
              <code class="text-xs text-muted">{{ truncateAddress(bc.owner) }}</code>
            </div>
            <p
              v-if="!transaction.balanceChanges.length"
              class="text-muted"
            >
              No balance changes in this transaction.
            </p>
          </div>
        </template>

        <template #events>
          <div class="space-y-2 p-4">
            <div
              v-for="(event, i) in transaction.events"
              :key="i"
              class="text-sm"
            >
              <code class="text-xs">{{ formatObjectType(event.type) }}</code>
            </div>
            <p
              v-if="!transaction.events.length"
              class="text-muted"
            >
              No events emitted by this transaction.
            </p>
          </div>
        </template>
      </UAccordion>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading && !error && hasSearched"
      class="text-center py-12"
    >
      <div class="text-6xl mb-4">
        🔍
      </div>
      <p class="text-muted">
        No transaction found. Check the hash and try again.
      </p>
    </div>

    <!-- WebLLM Setup Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showWebLLMSetup"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/70 backdrop-blur-sm"
            @click="handleCancelWebLLM"
          />
          <!-- Modal Content -->
          <div class="relative max-w-md w-full">
            <WebLLMLoader
              :status="webLLMStatus"
              :progress="webLLMProgress"
              :error="webLLMError"
              @enable="handleEnableWebLLM"
              @cancel="handleCancelWebLLM"
              @retry="handleRetryWebLLM"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </UContainer>
</template>

<style scoped>
/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
}
</style>
