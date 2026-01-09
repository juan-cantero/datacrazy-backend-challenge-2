import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { ICacheProvider } from './interfaces/cache-provider.interface';
import { LoggerService } from '../common/logger/logger.service';
import { MetricsService } from '../common/metrics/metrics.service';

/**
 * Cache service that provides abstraction over cache operations.
 * Handles key generation, TTL management, and cache operations.
 */
@Injectable()
export class CacheService implements ICacheProvider {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('CacheService');
  }

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
      this.logger.debug('Cache HIT', 'CacheService', { key: key.substring(0, 16) });
      this.metrics.incrementCacheHit();
    } else {
      this.logger.debug('Cache MISS', 'CacheService', { key: key.substring(0, 16) });
      this.metrics.incrementCacheMiss();
    }

    return value || null;
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
    this.logger.debug('Cache SET', 'CacheService', {
      key: key.substring(0, 16),
      ttl: `${ttl}ms`
    });
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
    this.logger.debug('Cache DEL', 'CacheService', { key: key.substring(0, 16) });
  }

  /**
   * Clear all cache entries
   */
  async reset(): Promise<void> {
    await this.cacheManager.reset();
    this.logger.log('Cache RESET - all entries cleared', 'CacheService');
  }
}
