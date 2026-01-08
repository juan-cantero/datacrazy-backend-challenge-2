import { Module } from '@nestjs/common';

/**
 * PessoaModule encapsulates all Pessoa-related functionality.
 *
 * Structure:
 * - PessoaDao (Data access layer)
 * - PessoaService (Business logic layer - optional)
 * - PessoaController (REST endpoints - optional)
 */
@Module({
  providers: [
    // PessoaDao will be added here in Phase 4
  ],
  exports: [
    // Export PessoaDao so other modules can use it
  ],
})
export class PessoaModule {}
