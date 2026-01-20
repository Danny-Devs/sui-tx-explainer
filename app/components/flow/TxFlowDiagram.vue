<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeTypesObject, Node, NodeMouseEvent } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { Background, BackgroundVariant } from '@vue-flow/background'
import type { TransactionData } from '~/composables/useSuiClient'
import type { FlowNodeData } from '~/composables/useTransactionFlow'
import FlowNode from './FlowNode.vue'
import NodeDetailPanel from './NodeDetailPanel.vue'

interface Props {
  transaction: TransactionData | null
  network?: 'mainnet' | 'testnet' | 'devnet'
}

const props = withDefaults(defineProps<Props>(), {
  network: 'mainnet'
})

const { nodes, edges, generateFlow } = useTransactionFlow()
const { fitView } = useVueFlow()

// Track selected node for detail panel
const selectedNode = ref<Node<FlowNodeData> | null>(null)

function handleNodeClick(event: NodeMouseEvent) {
  selectedNode.value = event.node as Node<FlowNodeData>
}

function closeDetailPanel() {
  selectedNode.value = null
}

// ESC key handler - lifted to parent so it's always active
function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && selectedNode.value) {
    closeDetailPanel()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})

// Register custom node types - use markRaw to prevent Vue reactivity on components
const nodeTypes: NodeTypesObject = {
  sender: markRaw(FlowNode) as any,
  function: markRaw(FlowNode) as any,
  object: markRaw(FlowNode) as any,
  recipient: markRaw(FlowNode) as any,
  gas: markRaw(FlowNode) as any,
  event: markRaw(FlowNode) as any
}

// Watch for transaction changes
watch(
  () => props.transaction,
  (tx) => {
    generateFlow(tx)
    // Fit view after nodes are rendered
    nextTick(() => {
      setTimeout(() => fitView({ padding: 0.3 }), 100)
    })
  },
  { immediate: true }
)

// MiniMap node color
function getMinimapNodeColor(node: any): string {
  return node.data?.color || '#4DA2FF'
}
</script>

<template>
  <div class="tx-flow-diagram h-[500px] lg:h-[550px] rounded-xl overflow-hidden border border-gray-800 bg-gray-950 relative">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :default-edge-options="{ type: 'smoothstep', animated: true }"
      :fit-view-on-init="true"
      :nodes-draggable="true"
      :nodes-connectable="false"
      :pan-on-drag="true"
      :zoom-on-scroll="true"
      class="vue-flow-dark"
      @node-click="handleNodeClick"
    >
      <!-- Background grid -->
      <Background
        :variant="BackgroundVariant.Dots"
        :gap="20"
        :size="1"
        pattern-color="#374151"
      />

      <!-- Controls -->
      <Controls position="bottom-right" />

      <!-- Mini map -->
      <MiniMap
        position="bottom-left"
        :node-color="getMinimapNodeColor"
        :node-stroke-color="() => '#1f2937'"
        :mask-color="'rgba(17, 24, 39, 0.8)'"
        pannable
        zoomable
      />

      <!-- Empty state -->
      <template #node-empty>
        <div class="text-gray-500 text-center p-8">
          <div class="text-4xl mb-4">
            🔍
          </div>
          <p>Paste a transaction hash to visualize the flow</p>
        </div>
      </template>
    </VueFlow>

    <!-- Inline Legend (horizontal, bottom) -->
    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 text-xs border border-gray-800 flex items-center gap-4 z-10">
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-[#4DA2FF]" />
        <span class="text-gray-400">Sender</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
        <span class="text-gray-400">Function</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
        <span class="text-gray-400">Created</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
        <span class="text-gray-400">Sent</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-2.5 h-2.5 rounded-full bg-[#6B7280]" />
        <span class="text-gray-400">Gas</span>
      </div>
    </div>

    <!-- Click-outside backdrop (transparent) -->
    <div
      v-if="selectedNode"
      class="absolute inset-0 z-40"
      @click="closeDetailPanel"
    />

    <!-- Node Detail Panel (slides in from right) -->
    <NodeDetailPanel
      :node="selectedNode"
      :network="network"
      @close="closeDetailPanel"
    />
  </div>
</template>

<style>
/* Vue Flow dark theme overrides */
.vue-flow-dark {
  --vf-node-bg: #1a1a2e;
  --vf-node-text: #ffffff;
  --vf-handle: #6b7280;
  --vf-box-shadow: none;
}

.vue-flow__minimap {
  background-color: #111827 !important;
  border-radius: 8px;
  border: 1px solid #374151;
}

.vue-flow__controls {
  background: #1f2937 !important;
  border-radius: 8px;
  border: 1px solid #374151;
}

.vue-flow__controls-button {
  background: #374151 !important;
  border: none !important;
  color: #9ca3af !important;
}

.vue-flow__controls-button:hover {
  background: #4b5563 !important;
}

/* Animated edges with flowing effect */
.vue-flow__edge-path {
  stroke-linecap: round;
  stroke-dasharray: 5;
  animation: flowDash 1s linear infinite;
}

@keyframes flowDash {
  to {
    stroke-dashoffset: -10;
  }
}

/* Edge glow effect */
.vue-flow__edge.animated .vue-flow__edge-path {
  filter: drop-shadow(0 0 3px currentColor);
}

/* Node hover effect */
.vue-flow__node:hover {
  z-index: 100;
}

/* Handle styling */
.vue-flow__handle {
  width: 10px !important;
  height: 10px !important;
  border-radius: 50% !important;
  background: #374151 !important;
  border: 2px solid #6b7280 !important;
  transition: all 0.2s ease;
}

.vue-flow__handle:hover {
  background: #4DA2FF !important;
  border-color: #4DA2FF !important;
  transform: scale(1.3);
}

/* Entrance animation for the whole diagram */
.tx-flow-diagram {
  animation: diagramFadeIn 0.6s ease-out;
}

@keyframes diagramFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
