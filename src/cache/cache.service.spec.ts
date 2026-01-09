import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheService } from './cache.service';
import { LoggerService } from '../common/logger/logger.service';
import { MetricsService } from '../common/metrics/metrics.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementCacheHit: jest.fn(),
            incrementCacheMiss: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate deterministic SHA256 hash', () => {
      const key1 = service.generateKey('findByEmail', ['test@example.com']);
      const key2 = service.generateKey('findByEmail', ['test@example.com']);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA256 hex length
      expect(key1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different keys for different prefixes', () => {
      const key1 = service.generateKey('findByEmail', ['test@example.com']);
      const key2 = service.generateKey('findByTelefone', ['test@example.com']);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const key1 = service.generateKey('findByEmail', ['email1@example.com']);
      const key2 = service.generateKey('findByEmail', ['email2@example.com']);

      expect(key1).not.toBe(key2);
    });
  });

  describe('get', () => {
    it('should return cached value on HIT', async () => {
      const testData = { id: '1', name: 'Test' };
      jest.spyOn(cacheManager, 'get').mockResolvedValue(testData);

      const result = await service.get('test-key');

      expect(result).toEqual(testData);
      expect(cacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null on MISS', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(undefined);

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store value in cache with TTL', async () => {
      const testData = { id: '1', name: 'Test' };
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      await service.set('test-key', testData, 5000);

      expect(cacheManager.set).toHaveBeenCalledWith('test-key', testData, 5000);
    });
  });

  describe('del', () => {
    it('should delete value from cache', async () => {
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.del('test-key');

      expect(cacheManager.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('reset', () => {
    it('should clear all cache entries', async () => {
      jest.spyOn(cacheManager, 'reset').mockResolvedValue(undefined);

      await service.reset();

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });
});
