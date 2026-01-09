import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

/**
 * Reusable cache module that provides cache abstraction.
 * Uses NestJS cache-manager under the hood.
 */
@Module({
  imports: [
    NestCacheModule.register({
      ttl: 300000, // 5 minutes default TTL
      max: 100, // Maximum number of items in cache
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
