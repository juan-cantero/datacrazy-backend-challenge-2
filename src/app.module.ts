import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { PessoaModule } from './pessoa/pessoa.module';
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * AppModule is the root module of the application.
 * Configures all application modules and dependencies.
 */
@Module({
  imports: [
    // ConfigModule loads environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // CacheModule configures in-memory caching
    CacheModule.register({
      isGlobal: true,
      ttl: parseInt(process.env.CACHE_TTL_SECONDS || '300') * 1000, // Convert seconds to milliseconds
      max: parseInt(process.env.CACHE_MAX_ITEMS || '100'),
    }),

    // PrismaModule provides database connection factory
    PrismaModule,

    // LoggerModule provides structured logging across the application
    LoggerModule,

    // MetricsModule provides performance tracking and monitoring
    MetricsModule,

    // PessoaModule contains all Pessoa-related functionality
    PessoaModule,
  ],
  controllers: [],
  providers: [
    // Apply LoggingInterceptor globally to all HTTP requests
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Apply HttpExceptionFilter globally to all exceptions
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
