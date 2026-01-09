import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerService: LoggerService;
  let metricsService: MetricsService;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
      }),
      getResponse: jest.fn().mockReturnValue({
        statusCode: 200,
      }),
    }),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            trackRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    loggerService = module.get<LoggerService>(LoggerService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should log incoming request', (done) => {
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of('test response'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(loggerService.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            ip: '127.0.0.1',
            userAgent: 'test-agent',
            requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          })
        );
        done();
      });
    });

    it('should log successful response completion', (done) => {
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of('test response'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(loggerService.log).toHaveBeenCalledWith(
          'Request completed',
          'HTTP',
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            statusCode: 200,
            responseTime: expect.stringMatching(/^\d+ms$/),
          })
        );
        done();
      });
    });

    it('should track metrics for successful request', (done) => {
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of('test response'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(metricsService.trackRequest).toHaveBeenCalledWith(
          'GET',
          '/test',
          expect.any(Number),
          200
        );
        done();
      });
    });

    it('should log error when request fails', (done) => {
      const error = new Error('Test error');
      (error as any).status = 500;

      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerService.error).toHaveBeenCalledWith(
            'Request failed',
            error.stack,
            'HTTP',
            expect.objectContaining({
              method: 'GET',
              url: '/test',
              statusCode: 500,
              responseTime: expect.stringMatching(/^\d+ms$/),
              error: 'Test error',
            })
          );
          done();
        },
      });
    });

    it('should track metrics for failed request', (done) => {
      const error = new Error('Test error');
      (error as any).status = 404;

      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(metricsService.trackRequest).toHaveBeenCalledWith(
            'GET',
            '/test',
            expect.any(Number),
            404
          );
          done();
        },
      });
    });

    it('should default to 500 status code for errors without status', (done) => {
      const error = new Error('Test error');

      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(loggerService.error).toHaveBeenCalledWith(
            'Request failed',
            error.stack,
            'HTTP',
            expect.objectContaining({
              statusCode: 500,
            })
          );
          done();
        },
      });
    });

    it('should generate unique request IDs', (done) => {
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of('test response'));

      const requestIds: string[] = [];

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const firstCall = (loggerService.log as jest.Mock).mock.calls[0][2];
        requestIds.push(firstCall.requestId);

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          const secondCall = (loggerService.log as jest.Mock).mock.calls[2][2];
          requestIds.push(secondCall.requestId);

          expect(requestIds[0]).not.toBe(requestIds[1]);
          done();
        });
      });
    });

    it('should calculate response time correctly', (done) => {
      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of('test response'));

      const startTime = Date.now();

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        const responseTime = Date.now() - startTime;
        const loggedResponseTime = (loggerService.log as jest.Mock).mock.calls[1][2].responseTime;
        const loggedTime = parseInt(loggedResponseTime.replace('ms', ''));

        expect(loggedTime).toBeGreaterThanOrEqual(0);
        expect(loggedTime).toBeLessThanOrEqual(responseTime + 10); // Allow small margin
        done();
      });
    });
  });
});
