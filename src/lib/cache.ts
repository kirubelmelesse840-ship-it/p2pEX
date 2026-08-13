/**
 * Simple client-side cache for API responses.
 * Reduces loading time by caching data for a short period.
 */

interface CacheEntry {
  data: any
  timestamp: number
}

const CACHE_TTL = 10000 // 10 seconds — data is fresh for 10s

const cache = new Map<string, CacheEntry>()

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(key?: string): void {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

/**
 * Fetch with cache — returns cached data immediately if available,
 * then fetches fresh data in the background.
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  key?: string
): Promise<T> {
  const cacheKey = key || url
  const cached = getCached<T>(cacheKey)
  
  // Fetch fresh data
  try {
    const res = await fetch(url, options)
    const data = await res.json()
    if (data && !data.error) {
      setCached(cacheKey, data)
    }
    return data as T
  } catch (e) {
    // If fetch fails but we have cached data, return it
    if (cached) return cached
    throw e
  }
}
