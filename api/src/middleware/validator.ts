import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { validationErrorResponse } from '../utils/response';

/**
 * Validation middleware - checks express-validator results
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
    }));

    return validationErrorResponse(res, formattedErrors);
  }

  return next(); // Added 'return' here for consistency
};

/**
 * Run validations and return middleware
 */
export const runValidations = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error) => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
      }));

      return validationErrorResponse(res, formattedErrors);
    }

    // THIS IS THE FIX: Added 'return' keyword
    return next(); 
  };
};