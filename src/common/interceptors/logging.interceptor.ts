import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';

/**
 * HTTP logging interceptor.
 *
 * Logs all HTTP requests and responses with:
 * - Request method and path
 * - Response time
 * - Status code
 * - Request ID for tracing
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = this.generateRequestId();

    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming request`, 'HTTP', {
      requestId,
      method,
      url,
      ip,
      userAgent,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const { statusCode } = response;

          // Log response
          this.logger.log(`Request completed`, 'HTTP', {
            requestId,
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
          });

          // Track metrics
          this.metrics.trackRequest(method, url, responseTime, statusCode);
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log error
          this.logger.error(
            `Request failed`,
            error.stack,
            'HTTP',
            {
              requestId,
              method,
              url,
              statusCode,
              responseTime: `${responseTime}ms`,
              error: error.message,
            },
          );

          // Track metrics
          this.metrics.trackRequest(method, url, responseTime, statusCode);
        },
      }),
    );
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
