<script setup lang="ts">
/**
 * Welcome Examples Component
 *
 * Shows first-run experience with curated example transactions.
 * UX principles:
 * - 3 examples (avoids choice paralysis)
 * - Diverse types (shows tool breadth)
 * - One-click action (removes friction)
 * - Dewey introduces (consistent personality)
 */

const emit = defineEmits<{
  selectExample: [digest: string, network: 'mainnet' | 'testnet']
}>()

// Curated example transactions - VERIFIED to exist on mainnet
const examples = [
  {
    id: 'nft',
    icon: '🖼️',
    title: 'NFT Mint',
    description: 'A new NFT being created on-chain',
    digest: '6M553ZVsUoCXgf5ji8DszN6WnSyQDninmV9t7aXBFDaR',
    network: 'mainnet' as const
  },
  {
    id: 'defi',
    icon: '🔄',
    title: 'DeFi Swap',
    description: 'Token swap on Cetus DEX',
    digest: '3vTY293XfxyTjMNZ8WsXxuwA7daw4uTJvwcbmHCTbrt5',
    network: 'mainnet' as const
  },
  {
    id: 'gaming',
    icon: '🎮',
    title: 'On-chain Gaming',
    description: 'A move in a blockchain game',
    digest: '4GsxPgRza8DFtRtrpBqXRWMb89HhUecFNSwsxjN5wSmn',
    network: 'mainnet' as const
  }
]

function handleSelect(example: typeof examples[0]) {
  emit('selectExample', example.digest, example.network)
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8">
    <!-- Dewey Welcome -->
    <div class="text-center mb-8">
      <div class="flex items-center justify-center gap-3 mb-4">
        <div
          class="text-5xl animate-bounce"
          style="animation-duration: 2s"
        >
          💧
        </div>
        <div class="text-2xl font-mono">
          (◕‿◕)
        </div>
      </div>
      <h2 class="text-xl font-semibold mb-2">
        Hi! I'm Dewey
      </h2>
      <p class="text-gray-400 max-w-md mx-auto">
        I help explain Sui blockchain transactions in plain English.
        Paste a transaction hash above, or try one of these examples!
      </p>
    </div>

    <!-- Example Cards -->
    <div class="grid sm:grid-cols-3 gap-4">
      <button
        v-for="example in examples"
        :key="example.id"
        class="group p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800 transition-all duration-200 text-left"
        @click="handleSelect(example)"
      >
        <div class="flex items-start gap-3">
          <div class="text-2xl group-hover:scale-110 transition-transform">
            {{ example.icon }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-white group-hover:text-blue-400 transition-colors">
              {{ example.title }}
            </h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ example.description }}
            </p>
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1 text-xs text-gray-600 group-hover:text-blue-500 transition-colors">
          <span>Try this</span>
          <UIcon
            name="i-heroicons-arrow-right"
            class="w-3 h-3 group-hover:translate-x-1 transition-transform"
          />
        </div>
      </button>
    </div>

    <!-- Subtle hint -->
    <p class="text-center text-xs text-gray-600 mt-6">
      Or paste any transaction hash from
      <a
        href="https://suiscan.xyz"
        target="_blank"
        rel="noopener"
        class="text-blue-500 hover:underline"
      >Suiscan</a>
      or
      <a
        href="https://suivision.xyz"
        target="_blank"
        rel="noopener"
        class="text-blue-500 hover:underline"
      >SuiVision</a>
    </p>
  </div>
</template>
