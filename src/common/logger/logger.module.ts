import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';

/**
 * Global logger module.
 * Provides structured logging across the application.
 */
@Global()
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
