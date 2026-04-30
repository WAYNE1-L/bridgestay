/**
 * Sentry observability integration
 * Safely initializes Sentry only when DSN is configured
 */

import React from 'react'
import * as Sentry from '@sentry/react'

let isInitialized = false

export function initSentry() {
  // Skip if already initialized
  if (isInitialized) {
    console.debug('Sentry already initialized')
    return
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN
  
  // Early return if no DSN configured
  if (!dsn) {
    console.debug('Sentry DSN not configured, skipping initialization')
    return
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_APP_ENVIRONMENT || 'production',
      tracesSampleRate: 0.2, // Capture 20% of transactions for performance monitoring
      replaysSessionSampleRate: 0.1, // Replay 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Always replay sessions with errors
      integrations: [
        // Automatically capture unhandled promise rejections
        Sentry.browserTracingIntegration(),
        // React Router integration
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect: React.useEffect,
        }),
        // Session replay for debugging
        Sentry.replayIntegration(),
      ],
      // Filter out common noise
      ignoreErrors: [
        // Known browser extension errors
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        'safari-extension://',
        // Network errors (handled separately)
        'NetworkError',
        'Network request failed',
        // Abort errors (expected behavior)
        'AbortError',
        'Aborted',
      ],
    })

    isInitialized = true
    console.info('Sentry initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Sentry:', error)
  }
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!isInitialized) return
  
  try {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    })
  } catch (e) {
    console.error('Failed to capture exception:', e)
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!isInitialized) return
  
  try {
    Sentry.captureMessage(message, level)
  } catch (error) {
    console.error('Failed to capture message:', error)
  }
}
