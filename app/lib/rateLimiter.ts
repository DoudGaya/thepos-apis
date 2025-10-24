type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Simple in-memory rate limiter for development.
 * key: unique identifier (phone/email/ip)
 * limit: max requests
 * windowMs: window in milliseconds
 */
export function consumeToken(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}

export function getRemaining(key: string) {
  const bucket = buckets.get(key)
  if (!bucket) return { remaining: 0, resetAt: 0 }
  return { remaining: Math.max(0, bucket.count), resetAt: bucket.resetAt }
}

// For testing only: clear all buckets
export function _clearBuckets() {
  buckets.clear()
}
