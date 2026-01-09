import { Injectable } from '@nestjs/common';
import { PessoaDao } from './pessoa.dao';
import { CacheService } from '../cache/cache.service';
import { LoggerService } from '../common/logger/logger.service';
import { PessoaNotFoundException, DuplicatePessoaException } from '../common/exceptions/business.exception';
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
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PessoaService');
  }

  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Create a new Pessoa record.
   * Evicts cache for the newly created email/telefone.
   */
  async create(data: Prisma.PessoaCreateInput): Promise<Pessoa> {
    this.logger.log('Creating new Pessoa', 'PessoaService', { email: data.email });

    try {
      const pessoa = await this.pessoaDao.create(data);

      // Evict cache for this pessoa
      await this.evictCacheForPessoa(pessoa);

      this.logger.log('Pessoa created successfully', 'PessoaService', { id: pessoa.id });
      return pessoa;
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        this.logger.warn('Duplicate Pessoa detected', 'PessoaService', { field, value: data[field] });
        throw new DuplicatePessoaException(field, data[field]);
      }
      throw error;
    }
  }

  /**
   * Find a Pessoa by ID.
   * No caching for ID lookups (fast primary key queries).
   */
  async findById(id: string): Promise<Pessoa> {
    this.logger.debug('Finding Pessoa by ID', 'PessoaService', { id });
    const pessoa = await this.pessoaDao.getById(id);

    if (!pessoa) {
      this.logger.warn('Pessoa not found by ID', 'PessoaService', { id });
      throw new PessoaNotFoundException(id, 'id');
    }

    this.logger.debug('Pessoa found by ID', 'PessoaService', { id });
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
    this.logger.debug('Finding Pessoa by email', 'PessoaService', { email });
    const cacheKey = this.cacheService.generateKey('findByEmail', [email]);

    // Try cache first
    const cached = await this.cacheService.get<Pessoa>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached Pessoa by email', 'PessoaService', { email });
      return cached;
    }

    // Cache miss - fetch from DAO
    const pessoa = await this.pessoaDao.findByEmail(email);

    if (!pessoa) {
      this.logger.warn('Pessoa not found by email', 'PessoaService', { email });
      throw new PessoaNotFoundException(email, 'email');
    }

    // Store in cache
    await this.cacheService.set(cacheKey, pessoa, this.CACHE_TTL);
    this.logger.debug('Pessoa found by email and cached', 'PessoaService', { email });

    return pessoa;
  }

  /**
   * Find Pessoa by telefone with intelligent caching.
   * Uses same caching strategy as findByEmail.
   */
  async findByTelefone(telefone: string): Promise<Pessoa> {
    this.logger.debug('Finding Pessoa by telefone', 'PessoaService', { telefone });
    const cacheKey = this.cacheService.generateKey('findByTelefone', [
      telefone,
    ]);

    // Try cache first
    const cached = await this.cacheService.get<Pessoa>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached Pessoa by telefone', 'PessoaService', { telefone });
      return cached;
    }

    // Cache miss - fetch from DAO
    const pessoa = await this.pessoaDao.findByTelefone(telefone);

    if (!pessoa) {
      this.logger.warn('Pessoa not found by telefone', 'PessoaService', { telefone });
      throw new PessoaNotFoundException(telefone, 'telefone');
    }

    // Store in cache
    await this.cacheService.set(cacheKey, pessoa, this.CACHE_TTL);
    this.logger.debug('Pessoa found by telefone and cached', 'PessoaService', { telefone });

    return pessoa;
  }

  /**
   * Find Pessoa records by name (partial match, case-insensitive).
   * No caching for search queries (results can vary).
   */
  async findByName(nome: string): Promise<Pessoa[]> {
    this.logger.debug('Finding Pessoas by name', 'PessoaService', { nome });
    const pessoas = await this.pessoaDao.findByName(nome);
    this.logger.debug('Found Pessoas by name', 'PessoaService', { nome, count: pessoas.length });
    return pessoas;
  }

  /**
   * Update an existing Pessoa record by ID.
   * Evicts cache for both old and new email/telefone values.
   */
  async update(id: string, data: Prisma.PessoaUpdateInput): Promise<Pessoa> {
    this.logger.log('Updating Pessoa', 'PessoaService', { id });
    // Get old data to evict old cache keys
    const oldPessoa = await this.pessoaDao.getById(id);

    if (!oldPessoa) {
      this.logger.warn('Pessoa not found for update', 'PessoaService', { id });
      throw new PessoaNotFoundException(id, 'id');
    }

    try {
      // Update the record
      const updatedPessoa = await this.pessoaDao.update(id, data);

      // Evict cache for both old and new values
      await this.evictCacheForPessoa(oldPessoa);
      await this.evictCacheForPessoa(updatedPessoa);

      this.logger.log('Pessoa updated successfully', 'PessoaService', { id });
      return updatedPessoa;
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0];
        this.logger.warn('Duplicate Pessoa detected on update', 'PessoaService', { field, value: data[field] });
        throw new DuplicatePessoaException(field, String(data[field]));
      }
      throw error;
    }
  }

  /**
   * Delete a Pessoa record by ID.
   * Evicts related cache entries before deletion.
   */
  async delete(id: string): Promise<Pessoa> {
    this.logger.log('Deleting Pessoa', 'PessoaService', { id });
    // Get data before deletion to evict cache
    const pessoa = await this.pessoaDao.getById(id);

    if (!pessoa) {
      this.logger.warn('Pessoa not found for deletion', 'PessoaService', { id });
      throw new PessoaNotFoundException(id, 'id');
    }

    // Delete the record
    const deleted = await this.pessoaDao.delete(id);

    // Evict cache
    await this.evictCacheForPessoa(pessoa);

    this.logger.log('Pessoa deleted successfully', 'PessoaService', { id });
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
