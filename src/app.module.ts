import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { PessoaModule } from './pessoa/pessoa.module';

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

    // PessoaModule contains all Pessoa-related functionality
    PessoaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
