/**
 * Interface for cache providers.
 * Allows swapping between different cache implementations (memory, Redis, etc.)
 */
export interface ICacheProvider {
  /**
   * Get a value from cache
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  del(key: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  reset(): Promise<void>;
}
