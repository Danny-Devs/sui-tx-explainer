// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/scripts'
  ],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: 'Sui Transaction Explainer - Understand Any Sui Transaction',
      meta: [
        { name: 'description', content: 'AI-powered tool that explains Sui blockchain transactions in plain English. Paste any transaction hash and get a human-readable explanation.' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Sui Transaction Explainer' },
        { property: 'og:description', content: 'Understand any Sui transaction in plain English. Powered by AI.' },
        { property: 'og:image', content: '/og-image.png' },
        { property: 'og:url', content: 'https://sui-explain.dev' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Sui Transaction Explainer' },
        { name: 'twitter:description', content: 'Understand any Sui transaction in plain English. Powered by AI.' },
        { name: 'twitter:image', content: '/og-image.png' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  css: [
    '~/assets/css/main.css',
    '@vue-flow/core/dist/style.css',
    '@vue-flow/core/dist/theme-default.css',
    '@vue-flow/controls/dist/style.css',
    '@vue-flow/minimap/dist/style.css'
  ],

  runtimeConfig: {
    // Server-only (not exposed to client)
    groqApiKey: process.env.GROQ_API_KEY
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
