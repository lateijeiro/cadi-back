export class AppError extends Error {
  statusCode: number;
  translationKey?: string;
  translationParams?: Record<string, string | number>;

  constructor(
    message: string,
    statusCode: number = 500,
    translationKey?: string,
    translationParams?: Record<string, string | number>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.translationKey = translationKey;
    this.translationParams = translationParams;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores comunes predefinidos
export class BadRequestError extends AppError {
  constructor(message?: string, translationKey?: string, params?: Record<string, string | number>) {
    super(message || 'Bad Request', 400, translationKey || 'errors.badRequest', params);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message?: string, translationKey?: string, params?: Record<string, string | number>) {
    super(message || 'Unauthorized', 401, translationKey || 'errors.unauthorized', params);
  }
}

export class ForbiddenError extends AppError {
  constructor(message?: string, translationKey?: string, params?: Record<string, string | number>) {
    super(message || 'Forbidden', 403, translationKey || 'errors.forbidden', params);
  }
}

export class NotFoundError extends AppError {
  constructor(message?: string, translationKey?: string, params?: Record<string, string | number>) {
    super(message || 'Not Found', 404, translationKey || 'errors.notFound', params);
  }
}

export class ValidationError extends AppError {
  constructor(message?: string, translationKey?: string, params?: Record<string, string | number>) {
    super(message || 'Validation Error', 422, translationKey || 'errors.validation', params);
  }
}
