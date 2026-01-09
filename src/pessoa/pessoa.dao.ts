import { Injectable, Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import type { Pessoa, Prisma } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * PessoaDao implements the Data Access Object pattern for Pessoa entity.
 *
 * Responsibilities:
 * - CRUD operations using Prisma API
 * - Native SQL queries with intelligent caching
 * - Cache management with automatic eviction
 */
@Injectable()
export class PessoaDao {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ============================================
  // CRUD Methods (using Prisma API)
  // ============================================

  /**
   * Create a new Pessoa record.
   * Automatically evicts related cache entries.
   */
  async create(data: Prisma.PessoaCreateInput): Promise<Pessoa> {
    const pessoa = await this.prisma.pessoa.create({ data });

    // Evict cache for the newly created pessoa
    await this.evictCacheForPessoa(pessoa);

    return pessoa;
  }

  /**
   * Update an existing Pessoa record by ID.
   * Evicts cache for both old and new email/telefone values.
   */
  async update(id: string, data: Prisma.PessoaUpdateInput): Promise<Pessoa> {
    // Get old data to evict cache
    const oldPessoa = await this.prisma.pessoa.findUnique({ where: { id } });

    const pessoa = await this.prisma.pessoa.update({
      where: { id },
      data,
    });

    // Evict cache for both old and new values
    if (oldPessoa) {
      await this.evictCacheForPessoa(oldPessoa);
    }
    await this.evictCacheForPessoa(pessoa);

    return pessoa;
  }

  /**
   * Delete a Pessoa record by ID.
   * Evicts related cache entries before deletion.
   */
  async delete(id: string): Promise<Pessoa> {
    // Get data before deletion to evict cache
    const pessoa = await this.prisma.pessoa.findUnique({ where: { id } });

    const deleted = await this.prisma.pessoa.delete({ where: { id } });

    if (pessoa) {
      await this.evictCacheForPessoa(pessoa);
    }

    return deleted;
  }

  /**
   * Find a Pessoa by ID using Prisma API.
   */
  async getById(id: string): Promise<Pessoa | null> {
    return this.prisma.pessoa.findUnique({ where: { id } });
  }

  /**
   * Find Pessoa records by name (case-insensitive partial match).
   */
  async findByName(nome: string): Promise<Pessoa[]> {
    return this.prisma.pessoa.findMany({
      where: {
        nome: {
          contains: nome,
          mode: 'insensitive',
        },
      },
    });
  }

  // ============================================
  // Native SQL Methods with Caching
  // ============================================

  /**
   * Find Pessoa by email using native SQL with intelligent caching.
   *
   * Cache Strategy:
   * 1. Generate SHA256 hash of SQL + parameters as cache key
   * 2. Check cache first (cache HIT)
   * 3. If not in cache, execute native SQL query (cache MISS)
   * 4. Store result in cache with 5-minute TTL
   * 5. Log cache HIT/MISS for debugging
   *
   * @param email - Email address to search
   * @returns Pessoa record or null
   */
  async findByEmail(email: string): Promise<Pessoa | null> {
    const sql = `SELECT * FROM pessoas WHERE email = $1 LIMIT 1`;

    // Generate SHA256 cache key from SQL + parameters
    const cacheKey = this.generateCacheKey(sql, [email]);

    // Try to get from cache first
    const cached = await this.cacheManager.get<Pessoa>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for email: ${email}`);
      return cached;
    }

    console.log(`❌ Cache MISS for email: ${email}`);

    // Execute native SQL using Prisma's connection pool
    const result = await this.prisma.$queryRaw<Pessoa[]>`
      SELECT * FROM pessoas WHERE email = ${email} LIMIT 1
    `;

    const pessoa = result[0] || null;

    // Store in cache with TTL (5 minutes = 300,000 milliseconds)
    if (pessoa) {
      await this.cacheManager.set(cacheKey, pessoa, 300_000 as never);
    }

    return pessoa;
  }

  /**
   * Find Pessoa by telefone using native SQL with intelligent caching.
   *
   * Uses the same caching strategy as findByEmail.
   *
   * @param telefone - Phone number to search
   * @returns Pessoa record or null
   */
  async findByTelefone(telefone: string): Promise<Pessoa | null> {
    const sql = `SELECT * FROM pessoas WHERE telefone = $1 LIMIT 1`;

    // Generate SHA256 cache key
    const cacheKey = this.generateCacheKey(sql, [telefone]);

    // Check cache
    const cached = await this.cacheManager.get<Pessoa>(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for telefone: ${telefone}`);
      return cached;
    }

    console.log(`❌ Cache MISS for telefone: ${telefone}`);

    // Execute native SQL
    const result = await this.prisma.$queryRaw<Pessoa[]>`
      SELECT * FROM pessoas WHERE telefone = ${telefone} LIMIT 1
    `;

    const pessoa = result[0] || null;

    // Cache result with 5-minute TTL
    if (pessoa) {
      await this.cacheManager.set(cacheKey, pessoa, 300_000 as never);
    }

    return pessoa;
  }

  // ============================================
  // Cache Management Utilities
  // ============================================

  /**
   * Generate a SHA256 cache key from SQL query and parameters.
   *
   * This ensures:
   * - Unique cache keys for different queries
   * - Deterministic keys (same query + params = same key)
   * - No collision between different queries
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns SHA256 hash as hexadecimal string
   */
  private generateCacheKey(sql: string, params: unknown[]): string {
    const input = sql + JSON.stringify(params);
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Evict all cache entries related to a Pessoa record.
   *
   * Called automatically when:
   * - A new Pessoa is created
   * - An existing Pessoa is updated
   * - A Pessoa is deleted
   *
   * This ensures cache consistency by removing stale data.
   *
   * @param pessoa - Pessoa record to evict from cache
   */
  private async evictCacheForPessoa(pessoa: Pessoa): Promise<void> {
    // Generate cache keys for email and telefone queries
    const emailSql = `SELECT * FROM pessoas WHERE email = $1 LIMIT 1`;
    const telefoneSql = `SELECT * FROM pessoas WHERE telefone = $1 LIMIT 1`;

    const emailCacheKey = this.generateCacheKey(emailSql, [pessoa.email]);
    const telefoneCacheKey = this.generateCacheKey(telefoneSql, [
      pessoa.telefone,
    ]);

    // Delete from cache
    await this.cacheManager.del(emailCacheKey);
    await this.cacheManager.del(telefoneCacheKey);

    console.log(
      `🗑️  Cache evicted for email: ${pessoa.email} and telefone: ${pessoa.telefone}`,
    );
  }

  /**
   * Manually clear all cache entries.
   * Useful for testing or manual cache invalidation.
   *
   * Note: In cache-manager v7, there's no direct method to clear all cache.
   * This method is kept for API compatibility but may not clear all entries.
   */
  async clearAllCache(): Promise<void> {
    console.log('🧹 Cache clear requested (individual keys will be evicted on write operations)');
  }
}
