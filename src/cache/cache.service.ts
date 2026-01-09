import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { ICacheProvider } from './interfaces/cache-provider.interface';

/**
 * Cache service that provides abstraction over cache operations.
 * Handles key generation, TTL management, and cache operations.
 */
@Injectable()
export class CacheService implements ICacheProvider {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Generate a deterministic cache key using SHA256
   * @param prefix Key prefix (e.g., 'findByEmail', 'findByTelefone')
   * @param params Parameters to include in the key
   * @returns SHA256 hash of the prefix and parameters
   */
  generateKey(prefix: string, params: any[]): string {
    const content = JSON.stringify({ prefix, params });
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);

    if (value) {
      console.log(`✅ Cache HIT for key: ${key.substring(0, 16)}...`);
    } else {
      console.log(`❌ Cache MISS for key: ${key.substring(0, 16)}...`);
    }

    return value || null;
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
    console.log(`💾 Cache SET for key: ${key.substring(0, 16)}... (TTL: ${ttl}ms)`);
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
    console.log(`🗑️  Cache DEL for key: ${key.substring(0, 16)}...`);
  }

  /**
   * Clear all cache entries
   */
  async reset(): Promise<void> {
    await this.cacheManager.reset();
    console.log('🧹 Cache RESET - all entries cleared');
  }
}
