<script setup lang="ts">
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const route = useRoute()
const digest = computed(() => route.params.digest as string)
const network = ref<'mainnet' | 'testnet'>('mainnet')

// Check for network in query params
if (route.query.network === 'testnet') {
  network.value = 'testnet'
}

// Fetch transaction data server-side for SEO
const { data: transaction, error, status } = await useAsyncData(
  `tx-${digest.value}`,
  async () => {
    const client = new SuiClient({ url: getFullnodeUrl(network.value) })

    const response = await client.getTransactionBlock({
      digest: digest.value,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true
      }
    })

    // Parse gas used
    const gasUsed = response.effects?.gasUsed
    const computation = BigInt(gasUsed?.computationCost || '0')
    const storage = BigInt(gasUsed?.storageCost || '0')
    const rebate = BigInt(gasUsed?.storageRebate || '0')
    const total = computation + storage - rebate

    // Parse object changes
    const objectChanges = {
      created: [] as Array<{ objectId: string, objectType: string, owner?: string }>,
      mutated: [] as Array<{ objectId: string, objectType: string, owner?: string }>,
      deleted: [] as Array<{ objectId: string, objectType: string }>,
      transferred: [] as Array<{ objectId: string, objectType: string, owner?: string }>
    }

    for (const change of response.objectChanges || []) {
      if (change.type === 'created') {
        objectChanges.created.push({
          objectId: change.objectId,
          objectType: change.objectType,
          owner: 'owner' in change ? String(change.owner) : undefined
        })
      } else if (change.type === 'mutated') {
        objectChanges.mutated.push({
          objectId: change.objectId,
          objectType: change.objectType,
          owner: 'owner' in change ? String(change.owner) : undefined
        })
      } else if (change.type === 'deleted') {
        objectChanges.deleted.push({
          objectId: change.objectId,
          objectType: change.objectType
        })
      } else if (change.type === 'transferred') {
        objectChanges.transferred.push({
          objectId: change.objectId,
          objectType: change.objectType,
          owner: 'recipient' in change ? String(change.recipient) : undefined
        })
      }
    }

    // Parse balance changes
    const balanceChanges = (response.balanceChanges || []).map((bc) => {
      const amount = BigInt(bc.amount)
      const decimals = bc.coinType.includes('sui::SUI') ? 9 : 6
      const value = Number(amount) / Math.pow(10, decimals)
      return {
        owner: 'owner' in bc ? String(bc.owner) : 'Unknown',
        coinType: bc.coinType,
        amount,
        amountFormatted: value.toLocaleString(undefined, { maximumFractionDigits: 4 })
      }
    })

    // Parse events
    const events = (response.events || []).map(e => ({
      type: e.type,
      parsedJson: e.parsedJson as Record<string, unknown>
    }))

    // Get function called
    let functionCalled: string | undefined
    const txData = response.transaction?.data?.transaction
    if (txData && 'kind' in txData && txData.kind === 'ProgrammableTransaction') {
      const ptb = txData as { transactions?: Array<{ MoveCall?: { package: string, module: string, function: string } }> }
      const moveCall = ptb.transactions?.find(t => t.MoveCall)?.MoveCall
      if (moveCall) {
        functionCalled = `${moveCall.module}::${moveCall.function}`
      }
    }

    return {
      digest: digest.value,
      sender: response.transaction?.data?.sender || 'Unknown',
      status: (response.effects?.status?.status === 'success' ? 'success' : 'failure') as 'success' | 'failure',
      error: response.effects?.status?.error,
      timestamp: response.timestampMs ? new Date(parseInt(response.timestampMs)) : null,
      gasUsed: { total, computation, storage, rebate },
      gasInSui: Number(total) / 1_000_000_000,
      objectChanges,
      balanceChanges,
      events,
      functionCalled,
      raw: response
    }
  }
)

// Generate dynamic meta tags
const txStatus = computed(() => transaction.value?.status === 'success' ? '✓' : '✗')
const txAction = computed(() => transaction.value?.functionCalled || 'Transaction')
const txSummary = computed(() => {
  if (!transaction.value) return 'View transaction details'
  const tx = transaction.value
  const parts = []
  if (tx.objectChanges.created.length) parts.push(`${tx.objectChanges.created.length} created`)
  if (tx.objectChanges.transferred.length) parts.push(`${tx.objectChanges.transferred.length} transferred`)
  if (tx.balanceChanges.length) parts.push(`${tx.balanceChanges.length} balance changes`)
  return parts.join(', ') || 'View transaction details'
})

const pageTitle = computed(() =>
  transaction.value
    ? `${txStatus.value} ${txAction.value} | Sui Explainer`
    : 'Transaction | Sui Explainer'
)

const pageDescription = computed(() =>
  transaction.value
    ? `Sui transaction explained: ${txSummary.value}. Gas: ${transaction.value.gasInSui.toFixed(4)} SUI`
    : 'View and understand this Sui blockchain transaction'
)

// Dynamic SEO meta tags
useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: '/og-image.png',
  ogUrl: () => `https://sui-explain.dev/tx/${digest.value}`,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: '/og-image.png'
})

// Share functionality
const shareUrl = computed(() => {
  const base = 'https://sui-explain.dev'
  const url = new URL(`/tx/${digest.value}`, base)
  if (network.value !== 'mainnet') {
    url.searchParams.set('network', network.value)
  }
  return url.toString()
})

const copied = ref(false)

async function copyLink() {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function shareOnTwitter() {
  const text = transaction.value
    ? `Check out this Sui transaction: ${txAction.value}\n\n${shareUrl.value}`
    : `Check out this Sui transaction:\n\n${shareUrl.value}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
  window.open(twitterUrl, '_blank', 'noopener,noreferrer')
}

// Explanation
const {
  explanation,
  loading: explainLoading,
  error: explainError,
  depth,
  explainWithTemplate,
  setDepth
} = useExplainer()

// Generate explanation when transaction loads
watch(transaction, (tx) => {
  if (tx) {
    explainWithTemplate(tx as Parameters<typeof explainWithTemplate>[0])
  }
}, { immediate: true })

function handleDepthChange(newDepth: 'eli5' | 'normal' | 'technical') {
  setDepth(newDepth)
  if (transaction.value) {
    explainWithTemplate(transaction.value as Parameters<typeof explainWithTemplate>[0])
  }
}

// Mascot expression
const mascotExpression = computed(() => {
  if (status.value === 'pending') return { face: '(◕.◕)?', message: 'Dewey is fetching...' }
  if (error.value) return { face: '(◕︵◕)', message: 'Hmm, something went wrong...' }
  if (!transaction.value) return { face: '(◕‿◕)', message: 'Loading transaction...' }

  const tx = transaction.value
  if (tx.status === 'failure') return { face: '(◕︵◕)', message: null }
  if (tx.gasInSui > 0.1) return { face: '(◕﹏◕)💦', message: null }
  if (tx.objectChanges.transferred.length > 0) return { face: '(◕ᴗ◕)✧', message: null }
  return { face: '(◕‿◕)', message: null }
})

// AI mode for chat
const aiEnabled = ref(false)
function handleEnableAI() {
  aiEnabled.value = true
}

// Helper functions
function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

function formatObjectType(type: string): string {
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
</script>

<template>
  <UContainer class="py-4">
    <!-- Back link + Share buttons -->
    <div class="flex items-center justify-between mb-4">
      <NuxtLink
        to="/"
        class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <UIcon name="i-heroicons-arrow-left" />
        <span>Explain another transaction</span>
      </NuxtLink>

      <!-- Share buttons -->
      <div class="flex items-center gap-2">
        <UButton
          size="sm"
          :color="copied ? 'success' : 'neutral'"
          variant="soft"
          :icon="copied ? 'i-heroicons-check' : 'i-heroicons-link'"
          @click="copyLink"
        >
          {{ copied ? 'Copied!' : 'Copy Link' }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-simple-icons-x"
          @click="shareOnTwitter"
        >
          Share
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="status === 'pending'"
      class="flex items-center justify-center py-20"
    >
      <div class="text-center">
        <div class="text-4xl mb-4 animate-bounce">
          💧
        </div>
        <p class="text-gray-400">
          Loading transaction...
        </p>
      </div>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      class="max-w-2xl mx-auto"
      :title="'Failed to load transaction'"
      :description="error.message"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Transaction Content -->
    <div v-else-if="transaction">
      <!-- Status Header -->
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
          <UBadge
            v-if="network === 'testnet'"
            color="warning"
            size="xs"
            variant="soft"
          >
            Testnet
          </UBadge>
        </div>
        <code class="text-xs text-muted">
          {{ truncateAddress(transaction.digest, 8) }}
        </code>
      </div>

      <!-- Main content grid -->
      <div class="grid xl:grid-cols-[1fr_360px] gap-4">
        <!-- Flow Diagram -->
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

          <!-- Object Changes Accordion -->
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

        <!-- Dewey Sidebar -->
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
  </UContainer>
</template>
