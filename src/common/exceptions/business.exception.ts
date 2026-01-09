import { NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception for when a Pessoa is not found.
 * Provides detailed context about what identifier was used.
 */
export class PessoaNotFoundException extends NotFoundException {
  constructor(identifier: string, type: 'id' | 'email' | 'telefone') {
    super({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'PESSOA_NOT_FOUND',
      message: `Pessoa with ${type} "${identifier}" not found`,
      details: { [type]: identifier },
    });
  }
}

/**
 * Custom exception for duplicate Pessoa records.
 * Thrown when attempting to create/update with existing CPF, email, or telefone.
 */
export class DuplicatePessoaException extends ConflictException {
  constructor(field: string, value: string) {
    super({
      statusCode: HttpStatus.CONFLICT,
      error: 'DUPLICATE_PESSOA',
      message: `Pessoa with ${field} "${value}" already exists`,
      details: { field, value },
    });
  }
}

/**
 * Custom exception for invalid business operations.
 * Used for business rule violations.
 */
export class InvalidOperationException extends HttpException {
  constructor(operation: string, reason: string) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'INVALID_OPERATION',
        message: `Cannot ${operation}: ${reason}`,
        details: { operation, reason },
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
