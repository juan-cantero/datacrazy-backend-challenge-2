import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

/**
 * Metrics controller for monitoring application health and performance.
 */
@ApiTags('Monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get application metrics
   */
  @Get()
  @ApiOperation({
    summary: 'Get application metrics',
    description:
      'Returns performance metrics including cache hit rates, request counts, response times, and error rates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', example: '2024-01-09T10:30:00.000Z' },
        uptime: { type: 'string', example: '3600s' },
        cache: {
          type: 'object',
          properties: {
            hits: { type: 'number', example: 150 },
            misses: { type: 'number', example: 50 },
            hitRate: { type: 'string', example: '75%' },
            total: { type: 'number', example: 200 },
          },
        },
        requests: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 500 },
            byEndpoint: { type: 'object' },
          },
        },
        errors: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  getMetrics() {
    return this.metricsService.getMetrics();
  }
}
