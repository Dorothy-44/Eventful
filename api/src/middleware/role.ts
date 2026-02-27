import { Request, Response, NextFunction } from 'express';
import { forbiddenResponse, unauthorizedResponse } from '../utils/response';

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    // Check if user is authenticated
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    // Check if user has allowed role
    if (!allowedRoles.includes(req.user.role)) {
      return forbiddenResponse(
        res,
        'You do not have permission to access this resource'
      );
    }

    next();
  };
};


export const creatorOnly = authorize('CREATOR');

export const eventeeOnly = authorize('EVENTEE');

export const anyRole = authorize('CREATOR', 'EVENTEE');