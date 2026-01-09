import { Module } from '@nestjs/common';
import { PessoaDao } from './pessoa.dao';

/**
 * PessoaModule encapsulates all Pessoa-related functionality.
 *
 * Structure:
 * - PessoaDao (Data access layer with caching)
 * - PessoaService (Business logic layer - optional)
 * - PessoaController (REST endpoints - optional)
 */
@Module({
  providers: [PessoaDao],
  exports: [PessoaDao],
})
export class PessoaModule {}
