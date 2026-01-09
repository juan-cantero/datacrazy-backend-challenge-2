import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for Pessoa responses.
 * Represents the complete Pessoa entity including auto-generated fields.
 */
export class PessoaResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Full name of the person',
    example: 'João Silva',
  })
  nome: string;

  @ApiProperty({
    description: 'Age of the person',
    example: 30,
  })
  idade: number;

  @ApiProperty({
    description: 'Brazilian CPF number (unique identifier)',
    example: '123.456.789-00',
  })
  cpf: string;

  @ApiProperty({
    description: 'Full address of the person',
    example: 'Rua A, 123 - São Paulo, SP',
  })
  endereco: string;

  @ApiProperty({
    description: 'Email address (unique)',
    example: 'joao.silva@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number in Brazilian format',
    example: '(11) 98765-4321',
  })
  telefone: string;

  @ApiProperty({
    description: 'Timestamp when the record was created',
    example: '2024-01-08T12:00:00.000Z',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the record was last updated',
    example: '2024-01-08T12:30:00.000Z',
    format: 'date-time',
  })
  updatedAt: Date;
}
