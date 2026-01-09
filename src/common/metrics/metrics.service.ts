import { Injectable } from '@nestjs/common';

/**
 * Metrics service for application monitoring.
 *
 * Tracks:
 * - Cache hit/miss rates
 * - Request counts by endpoint
 * - Average response times
 * - Error rates
 */
@Injectable()
export class MetricsService {
  private cacheHits = 0;
  private cacheMisses = 0;
  private requestCounts = new Map<string, number>();
  private responseTimes = new Map<string, number[]>();
  private errorCounts = new Map<string, number>();
  private startTime = Date.now();

  /**
   * Increment cache hit counter
   */
  incrementCacheHit(key?: string) {
    this.cacheHits++;
  }

  /**
   * Increment cache miss counter
   */
  incrementCacheMiss(key?: string) {
    this.cacheMisses++;
  }

  /**
   * Calculate cache hit rate percentage
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total === 0 ? 0 : Math.round((this.cacheHits / total) * 100 * 100) / 100;
  }

  /**
   * Track HTTP request
   */
  trackRequest(method: string, path: string, responseTime: number, statusCode: number) {
    const key = `${method} ${path}`;

    // Count requests
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    // Track response times
    if (!this.responseTimes.has(key)) {
      this.responseTimes.set(key, []);
    }
    this.responseTimes.get(key)!.push(responseTime);

    // Track errors (4xx and 5xx)
    if (statusCode >= 400) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }
  }

  /**
   * Calculate average response time for an endpoint
   */
  private getAverageResponseTime(key: string): number {
    const times = this.responseTimes.get(key) || [];
    if (times.length === 0) return 0;

    const sum = times.reduce((a, b) => a + b, 0);
    return Math.round((sum / times.length) * 100) / 100;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Build endpoints metrics
    const endpoints: Record<string, any> = {};
    for (const [key, count] of this.requestCounts.entries()) {
      endpoints[key] = {
        requests: count,
        avgResponseTime: `${this.getAverageResponseTime(key)}ms`,
        errors: this.errorCounts.get(key) || 0,
        errorRate: count > 0 ? `${Math.round((this.errorCounts.get(key) || 0) / count * 100 * 100) / 100}%` : '0%',
      };
    }

    return {
      timestamp: new Date().toISOString(),
      uptime: `${uptime}s`,
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: `${this.getCacheHitRate()}%`,
        total: this.cacheHits + this.cacheMisses,
      },
      requests: {
        total: Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0),
        byEndpoint: endpoints,
      },
      errors: {
        total: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
      },
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.requestCounts.clear();
    this.responseTimes.clear();
    this.errorCounts.clear();
    this.startTime = Date.now();
  }
}
