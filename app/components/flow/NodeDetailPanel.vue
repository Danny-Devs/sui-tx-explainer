<script setup lang="ts">
import type { Node } from '@vue-flow/core'
import type { FlowNodeData } from '~/composables/useTransactionFlow'
import {
  getObjectEducation,
  getGasLevel,
  getGasDescription,
  getGasColor,
  type TransactionContext,
} from '~/data/objectEducation'

interface Props {
  node: Node<FlowNodeData> | null
  network?: 'mainnet' | 'testnet' | 'devnet'
}

const props = withDefaults(defineProps<Props>(), {
  network: 'mainnet'
})

const emit = defineEmits<{
  close: []
}>()

// Safe access to node data
const nodeData = computed(() => props.node?.data)
const nodeType = computed(() => nodeData.value?.type)
const nodeLabel = computed(() => nodeData.value?.label || '')
const nodeIcon = computed(() => nodeData.value?.icon || '')
const nodeSublabel = computed(() => nodeData.value?.sublabel || '')
const nodeColor = computed(() => nodeData.value?.color || '#4DA2FF')
const nodeObjectId = computed(() => nodeData.value?.objectId)
const nodeObjectType = computed(() => nodeData.value?.objectType)
const nodeEventType = computed(() => nodeData.value?.eventType)
const nodeAmount = computed(() => nodeData.value?.amount)
const nodeDirection = computed(() => nodeData.value?.direction)
const nodeGasAmount = computed(() => nodeData.value?.gasAmount)

// Educational content
const objectEducation = computed(() => {
  if (!nodeObjectType.value && !nodeLabel.value) return null
  return getObjectEducation(nodeObjectType.value || nodeLabel.value)
})

// Build transaction context for contextual explanations
const txContext = computed((): TransactionContext => {
  // Infer action from sublabel
  const sublabel = nodeSublabel.value?.toLowerCase() || ''
  let action: TransactionContext['action'] = 'mutated'
  if (sublabel.includes('created')) action = 'created'
  else if (sublabel.includes('sent') || sublabel.includes('transferred')) action = 'transferred'
  else if (sublabel.includes('deleted')) action = 'deleted'

  return {
    action,
    amount: nodeAmount.value,
    direction: nodeDirection.value as 'in' | 'out' | undefined,
  }
})

// Gas contextualization
const gasLevel = computed(() => {
  if (!nodeGasAmount.value) return null
  const amount = parseFloat(nodeGasAmount.value)
  return isNaN(amount) ? null : getGasLevel(amount)
})

const gasDescription = computed(() => {
  if (!nodeGasAmount.value) return ''
  const amount = parseFloat(nodeGasAmount.value)
  return isNaN(amount) ? '' : getGasDescription(amount)
})

const gasColor = computed(() => {
  if (!nodeGasAmount.value) return '#6B7280'
  const amount = parseFloat(nodeGasAmount.value)
  return isNaN(amount) ? '#6B7280' : getGasColor(amount)
})

// Generate explorer URL
function getExplorerUrl(type: 'address' | 'object' | 'tx', id: string): string {
  const baseUrl = props.network === 'mainnet'
    ? 'https://suiscan.xyz/mainnet'
    : `https://suiscan.xyz/${props.network}`

  switch (type) {
    case 'address':
      return `${baseUrl}/account/${id}`
    case 'object':
      return `${baseUrl}/object/${id}`
    case 'tx':
      return `${baseUrl}/tx/${id}`
    default:
      return baseUrl
  }
}

// Copy to clipboard
function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}

// ESC handler is now in parent TxFlowDiagram.vue (always mounted)
</script>

<template>
  <Transition name="slide">
    <div
      v-if="node && nodeData"
      class="absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl z-50 overflow-hidden"
    >
      <!-- Header -->
      <div
        class="px-4 py-3 border-b border-gray-700 flex items-center justify-between"
        :style="{ backgroundColor: `${nodeColor}20` }"
      >
        <div class="flex items-center gap-2">
          <span class="text-2xl">{{ nodeIcon }}</span>
          <div>
            <div class="text-xs uppercase tracking-wider opacity-70" :style="{ color: nodeColor }">
              {{ nodeSublabel }}
            </div>
            <div class="font-semibold text-white">
              {{ nodeLabel }}
            </div>
          </div>
        </div>
        <button
          class="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-3 text-sm">
        <!-- Sender Node -->
        <template v-if="nodeType === 'sender'">
          <div>
            <div class="text-gray-400 text-xs mb-1">Full Address</div>
            <div class="flex items-center gap-2">
              <code class="text-xs bg-gray-800 px-2 py-1 rounded flex-1 truncate">
                {{ nodeLabel }}
              </code>
              <button
                class="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                title="Copy address"
                @click="copyToClipboard(nodeLabel)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            </div>
          </div>
          <a
            :href="getExplorerUrl('address', nodeLabel)"
            target="_blank"
            class="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            View on Suiscan
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </template>

        <!-- Function Node -->
        <template v-else-if="nodeType === 'function'">
          <div>
            <div class="text-gray-400 text-xs mb-1">Function Called</div>
            <code class="text-sm bg-gray-800 px-2 py-1.5 rounded block break-all font-mono">
              {{ nodeLabel }}
            </code>
          </div>
          <div class="text-gray-400 text-xs mt-2">
            This is the Move function that was executed in this transaction.
          </div>
        </template>

        <!-- Object Node - Educational Tiers -->
        <template v-else-if="nodeType === 'object'">
          <!-- Tier 1: Quick Context Card (always visible) -->
          <div v-if="objectEducation" class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-3">
            <div class="flex items-start gap-3">
              <span class="text-2xl">{{ objectEducation.icon }}</span>
              <div>
                <div class="font-medium text-blue-300">{{ nodeLabel }}</div>
                <div class="text-sm text-gray-300 mt-0.5">{{ objectEducation.shortDesc }}</div>
              </div>
            </div>
          </div>

          <!-- Tier 2: Why is it here? (context-aware) -->
          <div class="text-sm text-gray-300 mb-3">
            <span class="text-gray-500">In this transaction:</span>
            <span class="ml-1">{{ objectEducation?.whyHere(txContext) || 'This object was involved.' }}</span>
          </div>

          <!-- What is this? (expandable) -->
          <details v-if="objectEducation" class="mb-3 group">
            <summary class="text-sm text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-1">
              <svg class="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              What is a {{ nodeLabel }}?
            </summary>
            <p class="text-sm text-gray-300 mt-2 pl-5 border-l-2 border-gray-700">
              {{ objectEducation.whatIs }}
            </p>
          </details>

          <!-- Technical Details (collapsed) -->
          <details class="text-xs group">
            <summary class="text-gray-500 cursor-pointer hover:text-gray-400 flex items-center gap-1">
              <svg class="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              Technical Details
            </summary>
            <div class="mt-2 pl-4 space-y-2">
              <div v-if="nodeObjectType">
                <div class="text-gray-500 text-xs">Full Type</div>
                <code class="text-xs bg-gray-800 px-2 py-1 rounded block break-all mt-1">
                  {{ nodeObjectType }}
                </code>
              </div>
              <div v-if="nodeObjectId">
                <div class="text-gray-500 text-xs">Object ID</div>
                <div class="flex items-center gap-2 mt-1">
                  <code class="text-xs bg-gray-800 px-2 py-1 rounded flex-1 truncate">
                    {{ nodeObjectId }}
                  </code>
                  <button
                    class="p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Copy Object ID"
                    @click="copyToClipboard(nodeObjectId)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </details>

          <!-- Learn More + Explorer Link -->
          <div class="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700">
            <a
              v-if="objectEducation?.learnMore"
              :href="objectEducation.learnMore"
              target="_blank"
              class="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
            >
              📚 Learn more
            </a>
            <a
              v-if="nodeObjectId"
              :href="getExplorerUrl('object', nodeObjectId)"
              target="_blank"
              class="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
            >
              View on Suiscan ↗
            </a>
          </div>
        </template>

        <!-- Recipient Node -->
        <template v-else-if="nodeType === 'recipient'">
          <div>
            <div class="text-gray-400 text-xs mb-1">Address</div>
            <div class="flex items-center gap-2">
              <code class="text-xs bg-gray-800 px-2 py-1 rounded flex-1 truncate">
                {{ nodeLabel }}
              </code>
              <button
                class="p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                title="Copy address"
                @click="copyToClipboard(nodeLabel)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            </div>
          </div>
          <div v-if="nodeAmount">
            <div class="text-gray-400 text-xs mb-1">Balance Change</div>
            <div
              class="text-lg font-semibold"
              :class="nodeDirection === 'in' ? 'text-green-400' : 'text-red-400'"
            >
              {{ nodeAmount }}
            </div>
          </div>
          <a
            :href="getExplorerUrl('address', nodeLabel)"
            target="_blank"
            class="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            View on Suiscan
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </template>

        <!-- Gas Node - Contextualized -->
        <template v-else-if="nodeType === 'gas'">
          <div>
            <div class="text-gray-400 text-xs mb-1">Gas Consumed</div>
            <div class="flex items-center gap-2">
              <div class="text-lg font-semibold text-gray-300">
                {{ nodeLabel }}
              </div>
              <!-- Gas level badge -->
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :style="{
                  backgroundColor: `${gasColor}20`,
                  color: gasColor,
                  border: `1px solid ${gasColor}40`
                }"
              >
                {{ gasLevel === 'low' ? '🟢 Low' : gasLevel === 'normal' ? '🟡 Normal' : '🔴 High' }}
              </span>
            </div>
          </div>

          <!-- Context description -->
          <div class="text-sm text-gray-400 mt-2">
            {{ gasDescription }}
          </div>

          <!-- Educational content -->
          <details class="mt-3 group">
            <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-400 flex items-center gap-1">
              <svg class="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              What is gas?
            </summary>
            <p class="text-xs text-gray-400 mt-2 pl-4 border-l-2 border-gray-700">
              Gas fees pay validators for executing your transaction. Complex operations cost more gas.
              Sui's gas is significantly cheaper than most blockchains.
            </p>
          </details>
        </template>

        <!-- Event Node -->
        <template v-else-if="nodeType === 'event'">
          <div>
            <div class="text-gray-400 text-xs mb-1">Event Type</div>
            <code class="text-xs bg-gray-800 px-2 py-1 rounded block truncate">
              {{ nodeEventType || nodeLabel }}
            </code>
          </div>
          <div class="text-gray-400 text-xs">
            Events are emitted by Move functions and can be used to track on-chain activity.
          </div>
        </template>
      </div>

      <!-- Footer hint -->
      <div class="px-4 py-2 bg-gray-800/50 text-xs text-gray-500 text-center">
        Press ESC to close
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
