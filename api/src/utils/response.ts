import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: any[];
}
 //  pass succes response
 
export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};
 // Error response
 
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 400,
  error?: string,
  errors?: any[]
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
    errors,
  };
  return res.status(statusCode).json(response);
};
 // Validation error response
 
export const validationErrorResponse = (
  res: Response,
  errors: any[]
): Response => {
  return errorResponse(res, 'Validation failed', 422, undefined, errors);
};
// Unauthorized response
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized access'
): Response => {
  return errorResponse(res, message, 401);
};
 // Forbidden response
export const forbiddenResponse = (
  res: Response,
  message: string = 'Access forbidden'
): Response => {
  return errorResponse(res, message, 403);
};
// Not found response
export const notFoundResponse = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return errorResponse(res, message, 404);
};