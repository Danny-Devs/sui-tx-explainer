<script setup lang="ts">
import type { WebLLMProgress, WebLLMStatus } from '~/composables/useWebLLM.client'

interface Props {
  status: WebLLMStatus
  progress: WebLLMProgress
  error: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  enable: []
  cancel: []
  retry: []
}>()

// Fun facts to show while loading
const funFacts = [
  'Sui processes 297,000+ transactions per second',
  'The AI model runs 100% locally - your data never leaves your browser',
  'Sui uses an object-centric model, unlike account-based blockchains',
  'WebGPU accelerates AI inference using your graphics card',
  'Once downloaded, the AI works offline too!',
  'Sui\'s parallel execution makes it blazing fast',
  'This model has 3.8 billion parameters',
  'Dewey the water droplet is here to help you understand transactions'
]

// Rotate through fun facts
const currentFactIndex = ref(0)
const currentFact = computed(() => funFacts[currentFactIndex.value])

let factInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  factInterval = setInterval(() => {
    currentFactIndex.value = (currentFactIndex.value + 1) % funFacts.length
  }, 5000)
})

onUnmounted(() => {
  if (factInterval) clearInterval(factInterval)
})

// Format MB display
function formatMB(mb: number): string {
  if (mb >= 1000) {
    return `${(mb / 1000).toFixed(1)} GB`
  }
  return `${Math.round(mb)} MB`
}

// Progress bar color based on phase
const progressColor = computed(() => {
  switch (props.progress.phase) {
    case 'download': return 'bg-blue-500'
    case 'load': return 'bg-amber-500'
    case 'ready': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
})

// Mascot expression based on status
const mascotExpression = computed(() => {
  switch (props.status) {
    case 'loading':
      if (props.progress.phase === 'download') return '(o.o)...'
      if (props.progress.phase === 'load') return '(o.O)!'
      return '(o.o)?'
    case 'ready': return '(^.^)'
    case 'error': return '(T.T)'
    case 'generating': return '(o.o)...'
    default: return '(^.^)'
  }
})
</script>

<template>
  <div class="webllm-loader">
    <!-- Idle State: Opt-in prompt -->
    <div v-if="status === 'idle'" class="text-center p-6 bg-gray-900/50 rounded-xl border border-gray-700">
      <div class="flex items-center justify-center gap-3 mb-4">
        <div class="text-4xl animate-bounce">💧</div>
        <div class="text-xl font-mono">(^.^)</div>
      </div>
      <h3 class="text-lg font-semibold mb-2">Enable AI-Powered Explanations?</h3>
      <p class="text-gray-400 text-sm mb-4">
        Download a local AI model (~1.4 GB) for smarter, more detailed explanations.
        <br />
        <span class="text-green-400">100% private - runs entirely in your browser!</span>
      </p>
      <div class="flex gap-3 justify-center">
        <UButton color="primary" size="lg" @click="emit('enable')">
          Enable Local AI
        </UButton>
        <UButton color="neutral" variant="ghost" size="lg" @click="emit('cancel')">
          Use Basic Mode
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="status === 'loading'" class="p-6 bg-gray-900/50 rounded-xl border border-gray-700">
      <!-- Mascot + Status -->
      <div class="flex items-center gap-4 mb-6">
        <div class="relative">
          <div class="text-5xl animate-pulse">💧</div>
          <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-mono whitespace-nowrap">
            {{ mascotExpression }}
          </div>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold mb-1">
            {{ progress.phase === 'download' ? 'Downloading AI Model...' :
               progress.phase === 'load' ? 'Loading into GPU...' :
               'Preparing...' }}
          </h3>
          <p class="text-gray-400 text-sm">{{ progress.text }}</p>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mb-4">
        <div class="flex justify-between text-xs text-gray-400 mb-1">
          <span>
            <template v-if="progress.downloadedMB && progress.totalMB">
              {{ formatMB(progress.downloadedMB) }} / {{ formatMB(progress.totalMB) }}
            </template>
            <template v-else>
              {{ progress.phase === 'download' ? 'Downloading...' : 'Processing...' }}
            </template>
          </span>
          <span>{{ progress.progress }}%</span>
        </div>
        <div class="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300 ease-out"
            :class="progressColor"
            :style="{ width: `${progress.progress}%` }"
          />
        </div>
      </div>

      <!-- Fun Fact -->
      <div class="bg-gray-800/50 rounded-lg p-3 text-center">
        <p class="text-xs text-gray-500 mb-1">Did you know?</p>
        <p class="text-sm text-gray-300 transition-opacity duration-500">
          {{ currentFact }}
        </p>
      </div>

      <!-- Cancel Button -->
      <div class="mt-4 text-center">
        <button
          class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          @click="emit('cancel')"
        >
          Cancel and use basic mode
        </button>
      </div>
    </div>

    <!-- Ready State -->
    <div v-else-if="status === 'ready'" class="text-center p-4 bg-green-900/20 rounded-xl border border-green-700/50">
      <div class="flex items-center justify-center gap-2">
        <div class="text-2xl">💧</div>
        <span class="text-green-400 font-mono">(^.^)</span>
        <span class="text-green-400">AI Ready!</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="status === 'error'" class="p-6 bg-red-900/20 rounded-xl border border-red-700/50">
      <div class="flex items-center gap-3 mb-4">
        <div class="text-4xl">💧</div>
        <div class="text-xl font-mono">(T.T)</div>
      </div>
      <h3 class="text-lg font-semibold text-red-400 mb-2">Oops! Something went wrong</h3>
      <p class="text-gray-400 text-sm mb-4">{{ error }}</p>
      <div class="flex gap-3 justify-center">
        <UButton color="primary" @click="emit('retry')">
          Try Again
        </UButton>
        <UButton color="neutral" variant="ghost" @click="emit('cancel')">
          Use Basic Mode
        </UButton>
      </div>
    </div>

    <!-- Unsupported State -->
    <div v-else-if="status === 'unsupported'" class="p-6 bg-amber-900/20 rounded-xl border border-amber-700/50">
      <div class="flex items-center gap-3 mb-4">
        <div class="text-4xl">💧</div>
        <div class="text-xl font-mono">(o.o)?</div>
      </div>
      <h3 class="text-lg font-semibold text-amber-400 mb-2">Browser Not Supported</h3>
      <p class="text-gray-400 text-sm mb-4">
        Your browser doesn't support WebGPU, which is needed for local AI.
        <br />
        Try <strong>Chrome 113+</strong> or <strong>Edge 113+</strong> for the full experience.
      </p>
      <UButton color="neutral" variant="ghost" @click="emit('cancel')">
        Continue with Basic Mode
      </UButton>
    </div>

    <!-- Generating State (inline indicator) -->
    <div v-else-if="status === 'generating'" class="flex items-center gap-2 text-sm text-blue-400">
      <div class="text-lg animate-pulse">💧</div>
      <span class="font-mono">(o.o)...</span>
      <span>Dewey is thinking...</span>
    </div>
  </div>
</template>

<style scoped>
.webllm-loader {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
