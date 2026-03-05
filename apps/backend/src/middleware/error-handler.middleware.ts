import { Context } from 'hono';
import type { Env, AppVariables } from '../types/index.js';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class LlmError extends AppError {
  constructor(message: string) {
    super(502, message, 'LLM_ERROR');
    this.name = 'LlmError';
  }
}

export function errorHandler(err: Error, c: Context<{ Bindings: Env; Variables: AppVariables }>): Response {
  console.error(`[Error] ${err.name}: ${err.message}`, err.stack);

  if (err instanceof AppError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502
    );
  }

  if (err.message?.includes('JSON')) {
    return c.json(
      {
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
      },
      400
    );
  }

  return c.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    500
  );
}
