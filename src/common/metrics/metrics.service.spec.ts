import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    service.reset();
  });

  describe('incrementCacheHit', () => {
    it('should increment cache hit counter', () => {
      service.incrementCacheHit();
      service.incrementCacheHit();

      const metrics = service.getMetrics();
      expect(metrics.cache.hits).toBe(2);
    });
  });

  describe('incrementCacheMiss', () => {
    it('should increment cache miss counter', () => {
      service.incrementCacheMiss();
      service.incrementCacheMiss();
      service.incrementCacheMiss();

      const metrics = service.getMetrics();
      expect(metrics.cache.misses).toBe(3);
    });
  });

  describe('getCacheHitRate', () => {
    it('should return 0 when no cache operations', () => {
      expect(service.getCacheHitRate()).toBe(0);
    });

    it('should calculate correct hit rate', () => {
      service.incrementCacheHit();
      service.incrementCacheHit();
      service.incrementCacheHit();
      service.incrementCacheMiss();

      // 3 hits out of 4 total = 75%
      expect(service.getCacheHitRate()).toBe(75);
    });

    it('should return 100% when all hits', () => {
      service.incrementCacheHit();
      service.incrementCacheHit();

      expect(service.getCacheHitRate()).toBe(100);
    });

    it('should return 0% when all misses', () => {
      service.incrementCacheMiss();
      service.incrementCacheMiss();

      expect(service.getCacheHitRate()).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      service.incrementCacheHit();
      service.incrementCacheMiss();
      service.incrementCacheMiss();

      // 1 hit out of 3 total = 33.33%
      expect(service.getCacheHitRate()).toBe(33.33);
    });
  });

  describe('trackRequest', () => {
    it('should track request count', () => {
      service.trackRequest('GET', '/pessoas', 100, 200);
      service.trackRequest('GET', '/pessoas', 120, 200);

      const metrics = service.getMetrics();
      expect(metrics.requests.byEndpoint['GET /pessoas'].requests).toBe(2);
    });

    it('should track response times', () => {
      service.trackRequest('GET', '/pessoas', 100, 200);
      service.trackRequest('GET', '/pessoas', 200, 200);

      const metrics = service.getMetrics();
      // Average of 100 and 200 is 150
      expect(metrics.requests.byEndpoint['GET /pessoas'].avgResponseTime).toBe('150ms');
    });

    it('should track errors (4xx status)', () => {
      service.trackRequest('GET', '/pessoas/123', 50, 404);

      const metrics = service.getMetrics();
      expect(metrics.requests.byEndpoint['GET /pessoas/123'].errors).toBe(1);
      expect(metrics.errors.total).toBe(1);
    });

    it('should track errors (5xx status)', () => {
      service.trackRequest('POST', '/pessoas', 100, 500);

      const metrics = service.getMetrics();
      expect(metrics.requests.byEndpoint['POST /pessoas'].errors).toBe(1);
    });

    it('should not track 2xx as errors', () => {
      service.trackRequest('GET', '/pessoas', 100, 200);
      service.trackRequest('POST', '/pessoas', 150, 201);

      const metrics = service.getMetrics();
      expect(metrics.errors.total).toBe(0);
    });

    it('should calculate error rate correctly', () => {
      service.trackRequest('GET', '/test', 100, 200);
      service.trackRequest('GET', '/test', 100, 200);
      service.trackRequest('GET', '/test', 100, 500);
      service.trackRequest('GET', '/test', 100, 404);

      const metrics = service.getMetrics();
      // 2 errors out of 4 requests = 50%
      expect(metrics.requests.byEndpoint['GET /test'].errorRate).toBe('50%');
    });

    it('should track different endpoints independently', () => {
      service.trackRequest('GET', '/pessoas', 100, 200);
      service.trackRequest('POST', '/pessoas', 150, 201);
      service.trackRequest('GET', '/pessoas/123', 80, 200);

      const metrics = service.getMetrics();
      expect(metrics.requests.byEndpoint['GET /pessoas'].requests).toBe(1);
      expect(metrics.requests.byEndpoint['POST /pessoas'].requests).toBe(1);
      expect(metrics.requests.byEndpoint['GET /pessoas/123'].requests).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics with timestamp', () => {
      const metrics = service.getMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(new Date(metrics.timestamp)).toBeInstanceOf(Date);
    });

    it('should return uptime in seconds', () => {
      const metrics = service.getMetrics();

      expect(metrics.uptime).toMatch(/^\d+s$/);
    });

    it('should return cache metrics', () => {
      service.incrementCacheHit();
      service.incrementCacheMiss();

      const metrics = service.getMetrics();

      expect(metrics.cache).toEqual({
        hits: 1,
        misses: 1,
        hitRate: '50%',
        total: 2,
      });
    });

    it('should return total request count', () => {
      service.trackRequest('GET', '/pessoas', 100, 200);
      service.trackRequest('POST', '/pessoas', 150, 201);
      service.trackRequest('GET', '/test', 80, 200);

      const metrics = service.getMetrics();
      expect(metrics.requests.total).toBe(3);
    });

    it('should return total error count', () => {
      service.trackRequest('GET', '/test1', 100, 200);
      service.trackRequest('GET', '/test2', 100, 404);
      service.trackRequest('GET', '/test3', 100, 500);

      const metrics = service.getMetrics();
      expect(metrics.errors.total).toBe(2);
    });

    it('should handle zero requests gracefully', () => {
      const metrics = service.getMetrics();

      expect(metrics.requests.total).toBe(0);
      expect(metrics.requests.byEndpoint).toEqual({});
    });
  });

  describe('reset', () => {
    it('should reset all counters to zero', () => {
      service.incrementCacheHit();
      service.incrementCacheMiss();
      service.trackRequest('GET', '/test', 100, 200);

      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.cache.hits).toBe(0);
      expect(metrics.cache.misses).toBe(0);
      expect(metrics.requests.total).toBe(0);
      expect(metrics.errors.total).toBe(0);
    });

    it('should reset start time', () => {
      const beforeReset = service.getMetrics().uptime;

      service.reset();

      const afterReset = service.getMetrics().uptime;
      expect(afterReset).toBe('0s');
    });
  });
});
