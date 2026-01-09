import { PartialType } from '@nestjs/swagger';
import { CreatePessoaDto } from './create-pessoa.dto';

/**
 * DTO for updating an existing Pessoa record.
 * All fields are optional (extends CreatePessoaDto with PartialType).
 */
export class UpdatePessoaDto extends PartialType(CreatePessoaDto) {}
