import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

/**
 * Custom logger service with structured logging.
 *
 * Features:
 * - JSON formatted logs for easy parsing
 * - Timestamps on all logs
 * - Context tracking
 * - Additional metadata support
 * - Environment-aware (debug only in development)
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  /**
   * Log informational messages
   */
  log(message: string, context?: string, meta?: Record<string, any>) {
    this.printLog('info', message, context || this.context, meta);
  }

  /**
   * Log error messages with stack traces
   */
  error(message: string, trace?: string, context?: string, meta?: Record<string, any>) {
    this.printLog('error', message, context || this.context, { ...meta, trace });
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: string, meta?: Record<string, any>) {
    this.printLog('warn', message, context || this.context, meta);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: string, meta?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      this.printLog('debug', message, context || this.context, meta);
    }
  }

  /**
   * Log verbose messages (only in development with verbose flag)
   */
  verbose(message: string, context?: string, meta?: Record<string, any>) {
    if (process.env.LOG_LEVEL === 'verbose') {
      this.printLog('verbose', message, context || this.context, meta);
    }
  }

  /**
   * Print structured log in JSON format
   */
  private printLog(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context?: string,
    meta?: Record<string, any>,
  ) {
    const logObject = {
      level,
      timestamp: new Date().toISOString(),
      context: context || 'Application',
      message,
      ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
    };

    const logString = JSON.stringify(logObject);

    switch (level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'debug':
      case 'verbose':
        console.debug(logString);
        break;
      default:
        console.log(logString);
    }
  }
}
