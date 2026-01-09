import { Module } from '@nestjs/common';
import { PessoaDao } from './pessoa.dao';
import { PessoaService } from './pessoa.service';
import { PessoaController } from './pessoa.controller';
import { CacheModule } from '../cache/cache.module';

/**
 * PessoaModule encapsulates all Pessoa-related functionality.
 *
 * Architecture:
 * - PessoaController (REST endpoints)
 * - PessoaService (Business logic + cache coordination)
 * - PessoaDao (Data access layer)
 * - CacheModule (Cache abstraction)
 */
@Module({
  imports: [CacheModule],
  controllers: [PessoaController],
  providers: [PessoaService, PessoaDao],
  exports: [PessoaService],
})
export class PessoaModule {}
