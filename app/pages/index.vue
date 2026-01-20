<script setup lang="ts">
const { network, loading, error, transaction, fetchTransaction, clearError } = useSuiClient()
const {
  explanation,
  loading: explainLoading,
  error: explainError,
  depth,
  explainWithTemplate,
  setLoading: setExplainLoading,
  setError: setExplainError,
  setDepth,
  clear: clearExplanation
} = useExplainer()

// AI mode state - simple toggle, no downloads needed
const aiEnabled = ref(false)

// Main explain function - uses template always for initial explanation
async function explain(tx: typeof transaction.value) {
  if (!tx) return

  clearExplanation()
  setExplainLoading(true)

  try {
    // Use template for initial explanation (fast, no API call)
    explainWithTemplate(tx)
  } catch (e) {
    console.warn('Explanation failed:', e)
    setExplainError(e instanceof Error ? e.message : 'Explanation failed')
  } finally {
    setExplainLoading(false)
  }
}

function handleEnableAI() {
  // Simply toggle AI mode - no download or setup needed
  aiEnabled.value = true
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
  // Only intercept paste for URL parsing - extract digest from Suiscan/SuiVision URLs
  // For plain digests, let v-model handle naturally (don't set txInput manually)
  const pastedText = event.clipboardData?.getData('text')?.trim()
  if (!pastedText) return

  // Check if it's a block explorer URL that needs parsing
  if (pastedText.includes('suiscan.xyz') || pastedText.includes('suivision.xyz')) {
    event.preventDefault() // Stop native paste to avoid doubling
    // Extract digest from URL: .../txblock/DIGEST or .../tx/DIGEST
    const match = pastedText.match(/(?:txblock|tx)\/([A-Za-z0-9]+)/)
    if (match?.[1]) {
      txInput.value = match[1]
    } else {
      // Couldn't parse URL, let user paste as-is
      txInput.value = pastedText
    }
    // User must click "Explain" button - no auto-submit
  }
  // For plain digests (44 chars), v-model handles it automatically
  // No manual assignment = no doubling, no auto-submit
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

function copyToClipboard(text: string): void {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}
</script>

<template>
  <UContainer class="py-4">
    <!-- Search bar with network toggle -->
    <div class="max-w-3xl lg:max-w-4xl mx-auto mb-4">
      <div class="flex items-center gap-2">
        <UInput
          v-model="txInput"
          placeholder="Paste transaction hash or Suiscan link..."
          size="lg"
          class="flex-1 font-mono text-sm"
          @paste="handlePaste"
          @keydown.enter="handleExplain"
        />
        <div class="w-28">
          <UButton
            size="lg"
            :loading="loading"
            class="w-full"
            @click="handleExplain"
          >
            Explain
          </UButton>
        </div>
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

    <!-- Results - Responsive Grid Layout -->
    <div
      v-if="transaction"
      class="w-full"
    >
      <!-- Status Header - compact -->
      <div class="flex items-center justify-between mb-4">
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

      <!-- Main content grid: Flow + Dewey sidebar on xl+, stacked below -->
      <div class="grid xl:grid-cols-[1fr_360px] gap-4">
        <!-- Flow Diagram - THE KING -->
        <div class="space-y-4">
          <ClientOnly>
            <FlowTxFlowDiagram
              :transaction="transaction"
              :network="network"
            />
            <template #fallback>
              <div class="h-[500px] rounded-xl bg-gray-900 flex items-center justify-center">
                <div class="text-gray-500">
                  Loading visualization...
                </div>
              </div>
            </template>
          </ClientOnly>

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

        <!-- Dewey Sidebar (sticky on xl+) -->
        <div class="xl:sticky xl:top-4 xl:self-start h-[500px] xl:h-auto xl:max-h-[calc(100vh-2rem)]">
          <DeweyChat
            :transaction="transaction"
            :explanation="explanation"
            :explain-loading="explainLoading"
            :explain-error="explainError"
            :depth="depth"
            :mascot-face="mascotExpression.face"
            :mascot-message="mascotExpression.message"
            :ai-enabled="aiEnabled"
            @depth-change="handleDepthChange"
            @enable-a-i="handleEnableAI"
          />
        </div>
      </div>
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
  </UContainer>
</template>
