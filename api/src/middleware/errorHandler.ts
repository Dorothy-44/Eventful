import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: any,  // Changed from Error | AppError to any
  _req: Request,  // Added underscore
  res: Response,
  _next: NextFunction  // Added underscore
): Response => {
  let statusCode = 500;
  let message = 'Internal server error';
  let error = err.message;

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Handle Prisma errors - using err.name instead of instanceof
  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    switch (err.code) {
      case 'P2002':
        message = 'A record with this value already exists';
        error = `Duplicate field: ${err.meta?.target}`;
        break;
      case 'P2025':
        message = 'Record not found';
        error = 'The requested resource does not exist';
        statusCode = 404;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        error = 'Related record not found';
        break;
      default:
        message = 'Database operation failed';
        error = err.message;
    }
  }

  // Handle Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    message = 'Validation error';
    error = 'Invalid data provided';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    error = 'Authentication failed';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    error = 'Please login again';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  // Send error response
  return res.status(statusCode).json({
    success: false,
    message,
    error,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Handle 404 - Route not found
 */
export const notFound = (req: Request, res: Response): Response => {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
    error: `Cannot ${req.method} ${req.path}`,
  });
};

/**
 * Async handler wrapper - catches errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};