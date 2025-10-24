/**
 * Idempotency Utilities
 * 
 * Provides functions for generating unique idempotency keys to prevent
 * duplicate transaction processing.
 */

import { v4 as uuidv4 } from 'uuid'
import { createHash } from 'crypto'

/**
 * Generate a UUID v4 idempotency key
 * 
 * @returns string - UUID v4 format (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * 
 * @example
 * ```typescript
 * const key = generateIdempotencyKey()
 * // key = "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateIdempotencyKey(): string {
  return uuidv4()
}

/**
 * Generate a deterministic request ID from transaction data
 * 
 * Useful when you need a reproducible ID based on transaction details.
 * VTU.NG requires max 50 chars, so we use SHA256 truncated to 32 chars.
 * 
 * @param data - Transaction data to hash
 * @returns string - 32-character hex hash
 * 
 * @example
 * ```typescript
 * const requestId = generateRequestId({
 *   userId: 'user123',
 *   service: 'DATA',
 *   timestamp: Date.now()
 * })
 * // requestId = "a3f629a18f98a0bdf683070d6a06b623"
 * ```
 */
export function generateRequestId(data: {
  userId: string
  service: string
  timestamp: number
}): string {
  const hash = createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 32)  // VTU.NG max 50 chars, use 32 for safety

  return hash
}

/**
 * Generate a short idempotency key (for URLs or limited-length fields)
 * 
 * @returns string - 12-character alphanumeric string
 * 
 * @example
 * ```typescript
 * const key = generateShortKey()
 * // key = "a3f629a18f98"
 * ```
 */
export function generateShortKey(): string {
  return uuidv4().replace(/-/g, '').substring(0, 12)
}

/**
 * Validate if a string is a valid UUID v4
 * 
 * @param key - The string to validate
 * @returns boolean - True if valid UUID v4
 */
export function isValidUUID(key: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(key)
}

/**
 * Generate a timestamp-prefixed key for sortable idempotency keys
 * 
 * @returns string - Timestamp + UUID (e.g., "1697901234567-550e8400-e29b-41d4-a716-446655440000")
 * 
 * Useful when you need to sort transactions by creation time.
 */
export function generateTimestampedKey(): string {
  return `${Date.now()}-${uuidv4()}`
}
