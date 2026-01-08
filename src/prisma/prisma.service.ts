import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * PrismaService acts as the Connection Factory for the application.
 * Manages the database connection lifecycle and provides access to Prisma Client.
 *
 * Key features:
 * - Uses PostgreSQL adapter for Prisma 7 compatibility
 * - Extends PrismaClient to inherit all Prisma functionality
 * - Implements OnModuleInit to connect when NestJS starts
 * - Implements OnModuleDestroy to disconnect gracefully on shutdown
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    // Create PostgreSQL connection pool
    const connectionString = process.env.DATABASE_URL;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const pool: Pool = new Pool({ connectionString });

    // Create Prisma adapter for PostgreSQL
    const adapter = new PrismaPg(pool);

    // Initialize Prisma Client with adapter (required for Prisma 7)
    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });

    // Store pool reference for cleanup
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.pool = pool;
  }

  /**
   * Called when the module is initialized.
   * Establishes database connection.
   */
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  /**
   * Called when the module is being destroyed.
   * Ensures graceful shutdown of database connections.
   */
  async onModuleDestroy() {
    await this.$disconnect();
    // Close PostgreSQL connection pool
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.pool.end();
    console.log('🔌 Database disconnected');
  }
}
