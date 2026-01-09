import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized error response DTO.
 * Used across all API endpoints for consistent error messaging.
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 404,
    type: Number,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error code identifier',
    example: 'PESSOA_NOT_FOUND',
    type: String,
  })
  error: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Pessoa with email "test@example.com" not found',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the error occurred',
    example: '2024-01-09T12:00:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'API path where the error occurred',
    example: '/pessoas/email/test@example.com',
    type: String,
  })
  path: string;

  @ApiProperty({
    description: 'Additional error details (optional)',
    example: { field: 'email', value: 'test@example.com' },
    required: false,
    type: Object,
  })
  details?: Record<string, any>;
}
