/**
 * Retry Utility with Exponential Backoff
 * 
 * Automatically retries failed operations with increasing delays between attempts.
 * Useful for handling transient network errors and rate limiting.
 */

export interface RetryOptions {
  maxRetries: number
  baseDelay: number  // in milliseconds
  maxDelay?: number
  shouldRetry?: (error: any) => boolean
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise<T> - Result of the function
 * 
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetch('https://api.example.com'),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 1000,
 *     shouldRetry: (error) => error.response?.status >= 500
 *   }
 * )
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay = 30000, shouldRetry } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error
      }

      // Calculate delay with exponential backoff + jitter
      // jitter helps prevent thundering herd problem
      const exponentialDelay = baseDelay * Math.pow(2, attempt)
      const jitter = Math.random() * 1000
      const delay = Math.min(exponentialDelay + jitter, maxDelay)

      console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms`, {
        error: error.message,
        statusCode: error.response?.status,
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Default retry configuration for HTTP requests
 */
export const defaultHttpRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error) => {
    // Retry on network errors or 5xx server errors
    if (!error.response) return true // Network error
    const status = error.response.status
    return status >= 500 && status < 600
  },
}

/**
 * Retry configuration for vendor API calls
 * More conservative - only retry once on 5xx errors
 */
export const vendorRetryOptions: RetryOptions = {
  maxRetries: 1,
  baseDelay: 1000,
  maxDelay: 5000,
  shouldRetry: (error) => {
    // Only retry on 5xx server errors
    const status = error.response?.status
    return status >= 500 && status < 600
  },
}
