import { Module } from '@nestjs/common';
import { PessoaDao } from './pessoa.dao';
import { PessoaController } from './pessoa.controller';

/**
 * PessoaModule encapsulates all Pessoa-related functionality.
 *
 * Structure:
 * - PessoaDao (Data access layer with caching)
 * - PessoaController (REST endpoints with Swagger documentation)
 */
@Module({
  controllers: [PessoaController],
  providers: [PessoaDao],
  exports: [PessoaDao],
})
export class PessoaModule {}
