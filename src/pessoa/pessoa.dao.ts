import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Pessoa, Prisma } from '@prisma/client';

/**
 * PessoaDao implements the Data Access Object pattern for Pessoa entity.
 *
 * Responsibilities:
 * - Pure CRUD operations using Prisma API
 * - Native SQL queries for performance
 * - Database transactions
 * - NO business logic
 * - NO cache management (handled by Service layer)
 *
 * Architecture: Controller → Service → DAO → Database
 */
@Injectable()
export class PessoaDao {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // CRUD Methods (using Prisma API)
  // ============================================

  /**
   * Create a new Pessoa record.
   */
  async create(data: Prisma.PessoaCreateInput): Promise<Pessoa> {
    return this.prisma.pessoa.create({ data });
  }

  /**
   * Update an existing Pessoa record by ID.
   */
  async update(id: string, data: Prisma.PessoaUpdateInput): Promise<Pessoa> {
    return this.prisma.pessoa.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a Pessoa record by ID.
   */
  async delete(id: string): Promise<Pessoa> {
    return this.prisma.pessoa.delete({ where: { id } });
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
  // Native SQL Methods (for performance)
  // ============================================

  /**
   * Find Pessoa by email using native SQL.
   * Native SQL is used for consistent query execution patterns.
   *
   * @param email - Email address to search
   * @returns Pessoa record or null
   */
  async findByEmail(email: string): Promise<Pessoa | null> {
    const result = await this.prisma.$queryRaw<Pessoa[]>`
      SELECT * FROM pessoas WHERE email = ${email} LIMIT 1
    `;

    return result[0] || null;
  }

  /**
   * Find Pessoa by telefone using native SQL.
   * Native SQL is used for consistent query execution patterns.
   *
   * @param telefone - Phone number to search
   * @returns Pessoa record or null
   */
  async findByTelefone(telefone: string): Promise<Pessoa | null> {
    const result = await this.prisma.$queryRaw<Pessoa[]>`
      SELECT * FROM pessoas WHERE telefone = ${telefone} LIMIT 1
    `;

    return result[0] || null;
  }
}
