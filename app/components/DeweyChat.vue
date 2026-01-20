<script setup lang="ts">
import type { TransactionData } from '~/composables/useSuiClient'

interface Props {
  transaction: TransactionData | null
  explanation: string
  explainLoading: boolean
  explainError: string | null
  depth: 'eli5' | 'normal' | 'technical'
  mascotFace: string
  mascotMessage: string | null
  aiEnabled: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  depthChange: [depth: 'eli5' | 'normal' | 'technical']
  enableAI: []
}>()

// Chat functionality
const { messages, isTyping, inputText, suggestedQuestions, ask, askSuggested } = useDeweyChat(
  toRef(props, 'transaction'),
  toRef(props, 'depth'),
  toRef(props, 'aiEnabled')
)

function handleSend() {
  if (inputText.value.trim() && props.aiEnabled) {
    ask(inputText.value)
  }
}
</script>

<template>
  <div class="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden flex flex-col h-full">
    <!-- Header with mascot -->
    <div class="px-4 py-3 border-b border-gray-700 shrink-0">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div
            class="text-2xl"
            style="transform: rotate(15deg)"
          >
            💧
          </div>
          <div>
            <p class="text-lg font-mono">
              {{ mascotFace }}
            </p>
            <p class="text-xs text-gray-500">
              Dewey
            </p>
          </div>
        </div>

        <!-- Depth toggle -->
        <div class="inline-flex rounded-md shadow-sm">
          <button
            :class="[
              'px-2 py-1 text-xs rounded-l-md border',
              depth === 'eli5'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
            ]"
            @click="emit('depthChange', 'eli5')"
          >
            ELI5
          </button>
          <button
            :class="[
              'px-2 py-1 text-xs border-y',
              depth === 'normal'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
            ]"
            @click="emit('depthChange', 'normal')"
          >
            Normal
          </button>
          <button
            :class="[
              'px-2 py-1 text-xs rounded-r-md border',
              depth === 'technical'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
            ]"
            @click="emit('depthChange', 'technical')"
          >
            Technical
          </button>
        </div>
      </div>

      <!-- Mode toggle: Basic / AI -->
      <div class="flex justify-center">
        <div class="inline-flex rounded-md shadow-sm">
          <button
            :class="[
              'px-3 py-1 text-xs rounded-l-md border',
              !aiEnabled
                ? 'bg-gray-600 border-gray-600 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
            ]"
            @click="() => {}"
          >
            Basic
          </button>
          <button
            :class="[
              'px-3 py-1 text-xs rounded-r-md border',
              aiEnabled
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
            ]"
            @click="emit('enableAI')"
          >
            AI
          </button>
        </div>
      </div>
    </div>

    <!-- Scrollable content area with explicit max-height -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[300px] xl:max-h-[calc(100vh-350px)]">
      <!-- Initial explanation -->
      <div
        v-if="explainLoading"
        class="text-sm text-gray-400 animate-pulse"
      >
        {{ mascotMessage || 'Thinking...' }}
      </div>
      <div
        v-else-if="explainError"
        class="text-sm text-red-400"
      >
        {{ explainError }}
      </div>
      <div
        v-else-if="explanation"
        class="text-sm leading-relaxed text-gray-200"
      >
        {{ explanation }}
      </div>
      <div
        v-else-if="!transaction"
        class="text-sm text-gray-400"
      >
        {{ mascotMessage || 'Paste a transaction hash to get started!' }}
      </div>

      <!-- Quick summary -->
      <div
        v-if="transaction"
        class="pt-3 border-t border-gray-700 space-y-1 text-xs text-gray-400"
      >
        <p><strong>From:</strong> <code class="text-xs">{{ transaction.sender.slice(0, 10) }}...{{ transaction.sender.slice(-6) }}</code></p>
        <p v-if="transaction.functionCalled">
          <strong>Action:</strong> {{ transaction.functionCalled }}
        </p>
        <p><strong>Gas:</strong> {{ transaction.gasInSui.toFixed(4) }} SUI</p>
      </div>

      <!-- Chat messages -->
      <div
        v-if="messages.length > 0"
        class="pt-3 border-t border-gray-700 space-y-3"
      >
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="[
            'text-sm',
            msg.role === 'user' ? 'text-right' : 'text-left'
          ]"
        >
          <span
            :class="[
              'inline-block px-3 py-2 rounded-lg max-w-[90%]',
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200'
            ]"
          >
            {{ msg.content }}
          </span>
        </div>
        <div
          v-if="isTyping"
          class="text-left"
        >
          <span class="inline-block px-3 py-2 rounded-lg bg-gray-700 text-gray-400 text-sm">
            <span class="animate-pulse">Dewey is typing...</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Chat input area (fixed at bottom) -->
    <div
      v-if="transaction"
      class="shrink-0 border-t border-gray-700 p-3 bg-gray-900/50"
    >
      <!-- Suggested questions (shown in both modes) -->
      <div
        v-if="messages.length === 0 && suggestedQuestions.length > 0"
        class="flex flex-wrap gap-2 mb-3"
      >
        <button
          v-for="suggestion in suggestedQuestions"
          :key="suggestion.label"
          class="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
          @click="askSuggested(suggestion)"
        >
          {{ suggestion.label }}
        </button>
      </div>

      <!-- Freeform input (only in AI mode) -->
      <div
        v-if="aiEnabled"
        class="flex gap-2"
      >
        <input
          v-model="inputText"
          type="text"
          placeholder="Ask Dewey a question..."
          class="flex-1 px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          @keydown.enter="handleSend"
        >
        <button
          class="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!inputText.trim() || isTyping"
          @click="handleSend"
        >
          Ask
        </button>
      </div>

      <!-- Enable AI prompt (Basic mode) -->
      <div
        v-else
        class="text-center"
      >
        <p class="text-xs text-gray-500 mb-2">
          Have a specific question?
        </p>
        <button
          class="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors flex items-center gap-1.5 mx-auto"
          @click="emit('enableAI')"
        >
          <span>✨</span>
          <span>Ask Dewey</span>
        </button>
      </div>
    </div>
  </div>
</template>
