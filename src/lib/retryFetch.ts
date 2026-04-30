/**
 * Retry fetch utility with exponential backoff and timeout
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  timeout?: number
  retryCondition?: (error: Error) => boolean
}

export interface FetchOptions extends RequestInit {
  retry?: RetryOptions
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  timeout: 30000,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.name === 'TypeError' || // Network error
      error.name === 'AbortError' || // Timeout
      (error as { status?: number }).status && (error as { status: number }).status >= 500 // Server error
    )
  },
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 0.1 * exponentialDelay // Add 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Create a timeout promise that rejects after specified time
 */
function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`))
    }, timeout)
  })
}

/**
 * Enhanced fetch with retry logic, timeout, and error handling
 */
export async function retryFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retry = {}, ...fetchOptions } = options
  const retryConfig = { ...DEFAULT_RETRY_OPTIONS, ...retry }
  
  let lastError: Error

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutPromise = createTimeoutPromise(retryConfig.timeout)
      
      // Combine abort signals
      const abortSignal = fetchOptions.signal 
        ? AbortSignal.any([fetchOptions.signal, controller.signal])
        : controller.signal

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, {
          ...fetchOptions,
          signal: abortSignal,
        }),
        timeoutPromise,
      ])

      // Check if response is ok
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number }
        error.status = response.status
        throw error
      }

      return response
    } catch (error) {
      lastError = error as Error
      
      // Don't retry if we've exhausted attempts or retry condition fails
      if (attempt === retryConfig.maxRetries || !retryConfig.retryCondition(lastError)) {
        break
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, retryConfig.baseDelay, retryConfig.maxDelay)
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message)
      }
      
      await sleep(delay)
    }
  }

  throw lastError!
}

/**
 * Convenience method for JSON responses
 */
export async function retryFetchJson<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await retryFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  return response.json()
}

/**
 * Convenience method for text responses
 */
export async function retryFetchText(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const response = await retryFetch(url, options)
  return response.text()
}

/**
 * Create a fetch function with default retry options
 */
export function createRetryFetch(defaultOptions: RetryOptions = {}) {
  return (url: string, options: FetchOptions = {}) => {
    return retryFetch(url, {
      ...options,
      retry: { ...defaultOptions, ...options.retry },
    })
  }
}
