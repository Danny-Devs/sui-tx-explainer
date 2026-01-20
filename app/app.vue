<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Sui Transaction Explainer'
const description = 'Understand any Sui transaction in plain English. Paste a transaction hash and get a friendly explanation of what happened.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/og-image.png',
  twitterImage: '/og-image.png',
  twitterCard: 'summary_large_image'
})

</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <span class="text-2xl">💧</span>
          <span class="font-bold text-lg hidden sm:inline">Sui Explainer</span>
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <UButton
          to="https://github.com/Danny-Devs/sui-tx-explainer"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Built with 💙 for the Sui ecosystem
        </p>
      </template>

      <template #right>
        <UButton
          to="https://sui.io"
          target="_blank"
          size="sm"
          color="neutral"
          variant="ghost"
        >
          Powered by Sui
        </UButton>
      </template>
    </UFooter>
  </UApp>
</template>
