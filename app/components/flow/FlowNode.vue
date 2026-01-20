<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { FlowNodeData } from '~/composables/useTransactionFlow'

interface Props {
  data: FlowNodeData
  id?: string
}

const props = defineProps<Props>()

// Determine if we need handles based on node type
const showSourceHandle = computed(() =>
  ['sender', 'function', 'object'].includes(props.data.type)
)

const showTargetHandle = computed(() =>
  ['function', 'object', 'recipient', 'gas', 'event'].includes(props.data.type)
)

// Node style based on type
const nodeStyle = computed(() => {
  const baseStyle = {
    backgroundColor: '#1a1a2e',
    borderColor: props.data.color || '#4DA2FF',
    boxShadow: `0 0 20px ${props.data.color}40`
  }
  return baseStyle
})

// Hover state for enhanced effects
const isHovered = ref(false)

// Entrance animation delay based on node index
const nodeIndex = computed(() => {
  const id = props.id || ''
  const match = id.match(/node-(\d+)/)
  return match && match[1] ? parseInt(match[1]) : 0
})

const entranceDelay = computed(() => `${nodeIndex.value * 100}ms`)
</script>

<template>
  <div
    class="flow-node px-4 py-3 rounded-xl border-2 min-w-[160px] animate-node-enter cursor-pointer"
    :class="{ 'node-hovered': isHovered }"
    :style="{ ...nodeStyle, animationDelay: entranceDelay }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Click hint tooltip -->
    <div
      v-if="isHovered"
      class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded whitespace-nowrap z-50"
    >
      Click for details
    </div>
    <!-- Target Handle (left side) -->
    <Handle
      v-if="showTargetHandle"
      type="target"
      :position="Position.Left"
      class="!bg-gray-500 !border-gray-400"
    />

    <!-- Content -->
    <div class="flex items-center gap-3">
      <!-- Icon -->
      <div class="text-2xl">
        {{ data.icon }}
      </div>

      <!-- Labels -->
      <div class="flex-1 min-w-0">
        <div
          class="text-xs uppercase tracking-wider opacity-60 mb-0.5"
          :style="{ color: data.color }"
        >
          {{ data.sublabel }}
        </div>
        <div class="font-mono text-sm text-white truncate">
          {{ data.label }}
        </div>
        <div
          v-if="data.amount"
          class="text-xs font-semibold mt-1"
          :style="{ color: data.color }"
        >
          {{ data.amount }}
        </div>
      </div>
    </div>

    <!-- Source Handle (right side) -->
    <Handle
      v-if="showSourceHandle"
      type="source"
      :position="Position.Right"
      class="!bg-gray-500 !border-gray-400"
    />
  </div>
</template>

<style scoped>
.flow-node {
  font-family: 'Inter', system-ui, sans-serif;
  opacity: 0;
  transform: translateY(20px) scale(0.9);
  animation: nodeEnter 0.5s ease-out forwards;
  position: relative;
}

@keyframes nodeEnter {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.node-hovered {
  transform: scale(1.05) !important;
  box-shadow: 0 0 30px var(--node-color, #4DA2FF) !important;
  z-index: 100;
}

/* Subtle idle animation */
.flow-node:not(.node-hovered) {
  animation: nodeEnter 0.5s ease-out forwards, nodeIdle 3s ease-in-out infinite;
  animation-delay: var(--animation-delay, 0ms), 1s;
}

@keyframes nodeIdle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

/* Icon pulse on hover */
.node-hovered .text-2xl {
  animation: iconPulse 0.6s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
</style>
