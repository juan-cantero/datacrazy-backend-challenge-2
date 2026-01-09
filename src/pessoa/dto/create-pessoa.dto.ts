import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsEmail,
  IsNotEmpty,
  Min,
  Max,
  Matches,
} from 'class-validator';

/**
 * DTO for creating a new Pessoa record.
 * Includes validation rules and Swagger documentation.
 */
export class CreatePessoaDto {
  @ApiProperty({
    description: 'Full name of the person',
    example: 'João Silva',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({
    description: 'Age of the person',
    example: 30,
    minimum: 0,
    maximum: 150,
  })
  @IsInt()
  @Min(0)
  @Max(150)
  idade: number;

  @ApiProperty({
    description: 'Brazilian CPF number (unique identifier)',
    example: '123.456.789-00',
    pattern: '^[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$/, {
    message: 'CPF must be in the format XXX.XXX.XXX-XX',
  })
  cpf: string;

  @ApiProperty({
    description: 'Full address of the person',
    example: 'Rua A, 123 - São Paulo, SP',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  endereco: string;

  @ApiProperty({
    description: 'Email address (unique)',
    example: 'joao.silva@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Phone number in Brazilian format',
    example: '(11) 98765-4321',
    pattern: '^\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}$/, {
    message: 'Telefone must be in the format (XX) XXXXX-XXXX or (XX) XXXX-XXXX',
  })
  telefone: string;
}
