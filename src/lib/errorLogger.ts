/**
 * Pluggable error logging system with Sentry integration
 * Falls back to console logging when Sentry is not configured
 */

export interface ErrorLogger {
  captureException(error: Error, context?: Record<string, unknown>): void
  captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, unknown>): void
  addBreadcrumb(message: string, category?: string, level?: 'info' | 'warning' | 'error'): void
  setUser(user: { id?: string; email?: string; username?: string }): void
  setContext(key: string, context: Record<string, unknown>): void
  setTag(key: string, value: string): void
}

export interface WebVitals {
  name: string
  value: number
  delta: number
  id: string
  navigationType: string
}

class ConsoleErrorLogger implements ErrorLogger {
  captureException(error: Error, context?: Record<string, unknown>): void {
    console.error('Error captured:', error.message, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    })
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>): void {
    const logMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'
    console[logMethod](`[${level.toUpperCase()}] ${message}`, {
      context,
      timestamp: new Date().toISOString(),
    })
  }

  addBreadcrumb(message: string, category = 'default', level: 'info' | 'warning' | 'error' = 'info'): void {
    console.debug(`[BREADCRUMB:${category}] ${message}`, { level })
  }

  setUser(user: { id?: string; email?: string; username?: string }): void {
    console.debug('User context set:', user)
  }

  setContext(key: string, context: Record<string, unknown>): void {
    console.debug(`Context [${key}] set:`, context)
  }

  setTag(key: string, value: string): void {
    console.debug(`Tag [${key}] set to:`, value)
  }
}

class SentryErrorLogger implements ErrorLogger {
  private sentry: unknown

  constructor(sentry: unknown) {
    this.sentry = sentry
  }

  captureException(error: Error, context?: Record<string, unknown>): void {
    if (this.sentry && typeof this.sentry === 'object' && 'captureException' in this.sentry) {
      (this.sentry as { captureException: (error: Error, options?: unknown) => void }).captureException(error, {
        contexts: context ? { additional: context } : undefined,
      })
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>): void {
    if (this.sentry && typeof this.sentry === 'object' && 'captureMessage' in this.sentry) {
      (this.sentry as { captureMessage: (message: string, level: string, options?: unknown) => void }).captureMessage(message, level, {
        contexts: context ? { additional: context } : undefined,
      })
    }
  }

  addBreadcrumb(message: string, category = 'default', level: 'info' | 'warning' | 'error' = 'info'): void {
    if (this.sentry && typeof this.sentry === 'object' && 'addBreadcrumb' in this.sentry) {
      (this.sentry as { addBreadcrumb: (breadcrumb: unknown) => void }).addBreadcrumb({
        message,
        category,
        level,
        timestamp: Date.now() / 1000,
      })
    }
  }

  setUser(user: { id?: string; email?: string; username?: string }): void {
    if (this.sentry && typeof this.sentry === 'object' && 'setUser' in this.sentry) {
      (this.sentry as { setUser: (user: unknown) => void }).setUser(user)
    }
  }

  setContext(key: string, context: Record<string, unknown>): void {
    if (this.sentry && typeof this.sentry === 'object' && 'setContext' in this.sentry) {
      (this.sentry as { setContext: (key: string, context: unknown) => void }).setContext(key, context)
    }
  }

  setTag(key: string, value: string): void {
    if (this.sentry && typeof this.sentry === 'object' && 'setTag' in this.sentry) {
      (this.sentry as { setTag: (key: string, value: string) => void }).setTag(key, value)
    }
  }
}

let errorLogger: ErrorLogger

// Initialize error logger
export function initializeErrorLogger(): ErrorLogger {
  if (errorLogger) {
    return errorLogger
  }

  // Try to initialize Sentry if DSN is provided
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN
  if (sentryDsn) {
    try {
      // Dynamic import to avoid bundling Sentry when not needed
      import('@sentry/react').then((Sentry) => {
        Sentry.init({
          dsn: sentryDsn,
          environment: import.meta.env.MODE,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: false,
              blockAllMedia: false,
            }),
          ],
          tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          beforeSend(event) {
            // Filter out development errors
            if (import.meta.env.MODE === 'development') {
              console.log('Sentry event (dev mode):', event)
            }
            return event
          },
        })

        errorLogger = new SentryErrorLogger(Sentry)
        console.info('Sentry error logging initialized')
      }).catch((error) => {
        console.warn('Failed to initialize Sentry, falling back to console logging:', error)
        errorLogger = new ConsoleErrorLogger()
      })
    } catch (error) {
      console.warn('Sentry initialization failed, falling back to console logging:', error)
      errorLogger = new ConsoleErrorLogger()
    }
  } else {
    errorLogger = new ConsoleErrorLogger()
    console.info('Console error logging initialized (no Sentry DSN provided)')
  }

  return errorLogger
}

// Get the current error logger instance
export function getErrorLogger(): ErrorLogger {
  if (!errorLogger) {
    return initializeErrorLogger()
  }
  return errorLogger
}

// Web Vitals reporting
export function reportWebVitals(metric: WebVitals): void {
  const logger = getErrorLogger()
  
  logger.addBreadcrumb(
    `Web Vital: ${metric.name} = ${metric.value}ms`,
    'performance',
    metric.value > 2000 ? 'warning' : 'info'
  )

  // Send to analytics if available
  if (import.meta.env.VITE_ANALYTICS_ID) {
    // This would integrate with your analytics service
    console.debug('Web Vital reported:', metric)
  }
}

// Error boundary helper
export function captureErrorBoundaryError(error: Error, errorInfo: Record<string, unknown>): void {
  const logger = getErrorLogger()
  
  logger.captureException(error, {
    errorBoundary: true,
    componentStack: errorInfo.componentStack,
    errorBoundaryName: errorInfo.errorBoundaryName,
  })
}

// Router error helper
export function captureRouterError(error: Error, location?: string): void {
  const logger = getErrorLogger()
  
  logger.captureException(error, {
    router: true,
    location,
    pathname: window.location.pathname,
    search: window.location.search,
  })
}
