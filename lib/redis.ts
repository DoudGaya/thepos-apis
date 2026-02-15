// lib/redis.ts
import { Redis } from '@upstash/redis'

/**
 * Global Redis Client
 * 
 * Configured only if environment variables UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Otherwise, caching operations will be skipped gracefully.
 */

const getRedisClient = () => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.warn('Redis credentials not found. Caching will be disabled.');
        return null;
    }

    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

export const redis = getRedisClient();

/**
 * Cache Helper
 * Wraps a data fetcher function with Redis caching
 * 
 * @param key Cache key
 * @param fetcher Function that returns data if cache miss
 * @param ttlSeconds Time to live in seconds
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    if (!redis) {
        return fetcher();
    }

    try {
        const cached = await redis.get<T>(key);
        if (cached) {
            return cached;
        }

        const data = await fetcher();
        await redis.set(key, data, { ex: ttlSeconds });
        return data;
    } catch (error) {
        console.error('Redis Error:', error);
        return fetcher(); // Fallback to DB on redis error
    }
}
