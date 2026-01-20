import * as Sentry from '@sentry/nuxt'

// Get DSN from environment - Sentry only initializes if DSN is set
Sentry.init({
  dsn: '', // Set via NUXT_PUBLIC_SENTRY_DSN env var

  // Performance monitoring (10% in prod, 100% in dev)
  tracesSampleRate: 0.1,

  // Session Replay for error debugging
  replaysSessionSampleRate: 0, // Don't record sessions
  replaysOnErrorSampleRate: 1.0 // Record 100% of sessions with errors
})
