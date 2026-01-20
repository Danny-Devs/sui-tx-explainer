import * as Sentry from '@sentry/nuxt'

// Only initialize Sentry if DSN is provided
const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Set tracesSampleRate to capture performance data
    // Adjust this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
  })
}
