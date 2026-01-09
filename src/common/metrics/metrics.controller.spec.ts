import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let service: MetricsService;

  const mockMetrics = {
    timestamp: '2024-01-09T10:30:00.000Z',
    uptime: '3600s',
    cache: {
      hits: 150,
      misses: 50,
      hitRate: '75%',
      total: 200,
    },
    requests: {
      total: 500,
      byEndpoint: {
        'GET /pessoas': {
          requests: 300,
          avgResponseTime: '120ms',
          errors: 5,
          errorRate: '1.67%',
        },
        'POST /pessoas': {
          requests: 200,
          avgResponseTime: '250ms',
          errors: 10,
          errorRate: '5%',
        },
      },
    },
    errors: {
      total: 15,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getMetrics: jest.fn().mockReturnValue(mockMetrics),
          },
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return metrics from service', () => {
      const result = controller.getMetrics();

      expect(service.getMetrics).toHaveBeenCalled();
      expect(result).toEqual(mockMetrics);
    });

    it('should return metrics with correct structure', () => {
      const result = controller.getMetrics();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('cache');
      expect(result).toHaveProperty('requests');
      expect(result).toHaveProperty('errors');
    });

    it('should return cache metrics', () => {
      const result = controller.getMetrics();

      expect(result.cache).toHaveProperty('hits');
      expect(result.cache).toHaveProperty('misses');
      expect(result.cache).toHaveProperty('hitRate');
      expect(result.cache).toHaveProperty('total');
    });

    it('should return request metrics', () => {
      const result = controller.getMetrics();

      expect(result.requests).toHaveProperty('total');
      expect(result.requests).toHaveProperty('byEndpoint');
    });

    it('should return endpoint-specific metrics', () => {
      const result = controller.getMetrics();

      const endpointMetrics = result.requests.byEndpoint['GET /pessoas'];
      expect(endpointMetrics).toHaveProperty('requests');
      expect(endpointMetrics).toHaveProperty('avgResponseTime');
      expect(endpointMetrics).toHaveProperty('errors');
      expect(endpointMetrics).toHaveProperty('errorRate');
    });
  });
});
