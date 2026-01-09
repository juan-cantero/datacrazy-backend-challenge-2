import { Injectable, NotFoundException } from '@nestjs/common';
import { PessoaDao } from './pessoa.dao';
import { CacheService } from '../cache/cache.service';
import type { Pessoa, Prisma } from '@prisma/client';

/**
 * PessoaService implements business logic layer for Pessoa entity.
 *
 * Responsibilities:
 * - Orchestrate cache + DAO operations
 * - Business logic and validation
 * - Transform data between layers
 * - Coordinate cache eviction on mutations
 *
 * Architecture: Controller → Service → (Cache + DAO) → Database
 */
@Injectable()
export class PessoaService {
  private readonly CACHE_TTL = 300_000; // 5 minutes

  constructor(
    private readonly pessoaDao: PessoaDao,
    private readonly cacheService: CacheService,
  ) {}

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Create a new Pessoa record.
   * Evicts cache for the newly created email/telefone.
   */
  async create(data: Prisma.PessoaCreateInput): Promise<Pessoa> {
    const pessoa = await this.pessoaDao.create(data);

    // Evict cache for this pessoa
    await this.evictCacheForPessoa(pessoa);

    return pessoa;
  }

  /**
   * Find a Pessoa by ID.
   * No caching for ID lookups (fast primary key queries).
   */
  async findById(id: string): Promise<Pessoa> {
    const pessoa = await this.pessoaDao.getById(id);

    if (!pessoa) {
      throw new NotFoundException(`Pessoa with ID "${id}" not found`);
    }

    return pessoa;
  }

  /**
   * Find Pessoa by email with intelligent caching.
   *
   * Cache Strategy:
   * 1. Check cache first (cache HIT)
   * 2. If not in cache, query database (cache MISS)
   * 3. Store result in cache with TTL
   */
  async findByEmail(email: string): Promise<Pessoa> {
    const cacheKey = this.cacheService.generateKey('findByEmail', [email]);

    // Try cache first
    const cached = await this.cacheService.get<Pessoa>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from DAO
    const pessoa = await this.pessoaDao.findByEmail(email);

    if (!pessoa) {
      throw new NotFoundException(`Pessoa with email "${email}" not found`);
    }

    // Store in cache
    await this.cacheService.set(cacheKey, pessoa, this.CACHE_TTL);

    return pessoa;
  }

  /**
   * Find Pessoa by telefone with intelligent caching.
   * Uses same caching strategy as findByEmail.
   */
  async findByTelefone(telefone: string): Promise<Pessoa> {
    const cacheKey = this.cacheService.generateKey('findByTelefone', [
      telefone,
    ]);

    // Try cache first
    const cached = await this.cacheService.get<Pessoa>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from DAO
    const pessoa = await this.pessoaDao.findByTelefone(telefone);

    if (!pessoa) {
      throw new NotFoundException(
        `Pessoa with telefone "${telefone}" not found`,
      );
    }

    // Store in cache
    await this.cacheService.set(cacheKey, pessoa, this.CACHE_TTL);

    return pessoa;
  }

  /**
   * Find Pessoa records by name (partial match, case-insensitive).
   * No caching for search queries (results can vary).
   */
  async findByName(nome: string): Promise<Pessoa[]> {
    return this.pessoaDao.findByName(nome);
  }

  /**
   * Update an existing Pessoa record by ID.
   * Evicts cache for both old and new email/telefone values.
   */
  async update(id: string, data: Prisma.PessoaUpdateInput): Promise<Pessoa> {
    // Get old data to evict old cache keys
    const oldPessoa = await this.pessoaDao.getById(id);

    if (!oldPessoa) {
      throw new NotFoundException(`Pessoa with ID "${id}" not found`);
    }

    // Update the record
    const updatedPessoa = await this.pessoaDao.update(id, data);

    // Evict cache for both old and new values
    await this.evictCacheForPessoa(oldPessoa);
    await this.evictCacheForPessoa(updatedPessoa);

    return updatedPessoa;
  }

  /**
   * Delete a Pessoa record by ID.
   * Evicts related cache entries before deletion.
   */
  async delete(id: string): Promise<Pessoa> {
    // Get data before deletion to evict cache
    const pessoa = await this.pessoaDao.getById(id);

    if (!pessoa) {
      throw new NotFoundException(`Pessoa with ID "${id}" not found`);
    }

    // Delete the record
    const deleted = await this.pessoaDao.delete(id);

    // Evict cache
    await this.evictCacheForPessoa(pessoa);

    return deleted;
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Evict all cache entries related to a Pessoa record.
   *
   * Ensures cache consistency by removing stale data when:
   * - A new Pessoa is created
   * - An existing Pessoa is updated
   * - A Pessoa is deleted
   */
  private async evictCacheForPessoa(pessoa: Pessoa): Promise<void> {
    const emailCacheKey = this.cacheService.generateKey('findByEmail', [
      pessoa.email,
    ]);
    const telefoneCacheKey = this.cacheService.generateKey('findByTelefone', [
      pessoa.telefone,
    ]);

    await this.cacheService.del(emailCacheKey);
    await this.cacheService.del(telefoneCacheKey);
  }
}
