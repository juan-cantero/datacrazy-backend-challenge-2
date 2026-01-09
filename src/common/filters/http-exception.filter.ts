import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * Global exception filter that catches all exceptions
 * and formats them into a consistent error response.
 *
 * Handles:
 * - HttpException (NestJS built-in exceptions)
 * - Custom business exceptions
 * - Unexpected errors (500 Internal Server Error)
 * - Prisma errors (database constraints)
 *
 * Security Note:
 * - Respects EXPOSE_ERROR_DETAILS env var to prevent information disclosure
 * - In production (EXPOSE_ERROR_DETAILS=false), returns generic error messages
 *   to prevent user enumeration attacks (e.g., attackers discovering valid emails)
 * - In development (EXPOSE_ERROR_DETAILS=true), returns detailed errors for debugging
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly exposeErrorDetails: boolean;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HttpExceptionFilter');
    // Default to false (secure) if not set
    this.exposeErrorDetails = process.env.EXPOSE_ERROR_DETAILS === 'true';
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error details
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    // Handle different response formats
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails: Record<string, any> | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      errorCode = (exceptionResponse as any).error || exception.name || errorCode;
      errorMessage = (exceptionResponse as any).message || errorMessage;
      errorDetails = (exceptionResponse as any).details;
    } else if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (exception.message) {
      errorMessage = exception.message;
    }

    // Handle Prisma unique constraint violations
    if (exception.code === 'P2002') {
      errorCode = 'DUPLICATE_ENTRY';
      const field = exception.meta?.target?.[0] || 'field';
      errorMessage = `A record with this ${field} already exists`;
      errorDetails = { field, constraint: 'unique' };
    }

    // Handle Prisma foreign key violations
    if (exception.code === 'P2003') {
      errorCode = 'FOREIGN_KEY_VIOLATION';
      errorMessage = 'Referenced record does not exist';
      errorDetails = { constraint: 'foreign_key' };
    }

    // Build standardized error response
    let sanitizedMessage = errorMessage;
    let sanitizedDetails = errorDetails;

    // Security: Sanitize error messages in production to prevent information disclosure
    if (!this.exposeErrorDetails && status < 500) {
      // For 4xx errors (client errors), use generic messages to prevent user enumeration
      const genericMessages: Record<number, string> = {
        400: 'Invalid request data',
        401: 'Authentication required',
        403: 'Access forbidden',
        404: 'Resource not found',
        409: 'Resource conflict - unable to process request',
        422: 'Unable to process request',
      };

      sanitizedMessage = genericMessages[status] || 'Request failed';
      sanitizedDetails = undefined; // Don't expose field details in production
    }

    const errorResponse: ErrorResponseDto = {
      statusCode: status,
      error: errorCode,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(sanitizedDetails && { details: sanitizedDetails }),
    };

    // Log the error (always log full details internally, regardless of exposure setting)
    if (status >= 500) {
      this.logger.error(
        errorMessage, // Log original message, not sanitized
        exception.stack,
        'HttpExceptionFilter',
        {
          statusCode: status,
          path: request.url,
          method: request.method,
          errorCode,
          details: errorDetails, // Log original details
          exposedToClient: this.exposeErrorDetails,
        },
      );
    } else {
      this.logger.warn(
        errorMessage, // Log original message, not sanitized
        'HttpExceptionFilter',
        {
          statusCode: status,
          path: request.url,
          method: request.method,
          errorCode,
          details: errorDetails, // Log original details
          exposedToClient: this.exposeErrorDetails,
        },
      );
    }

    // Send response (sanitized if production, detailed if development)
    response.status(status).json(errorResponse);
  }
}
