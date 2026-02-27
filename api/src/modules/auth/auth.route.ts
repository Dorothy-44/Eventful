import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';
import { runValidations } from '../../middleware/validator';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  refreshToken,
} from './auth.controller';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
} from './auth.validator';

const router = Router();

// Public routes (with rate limiting)
router.post(
  '/register',
  authLimiter,
  runValidations(registerValidator),
  asyncHandler(register)
);

router.post(
  '/login',
  authLimiter,
  runValidations(loginValidator),
  asyncHandler(login)
);

// Protected routes
router.get('/profile', authenticate, asyncHandler(getProfile));

router.put(
  '/profile',
  authenticate,
  runValidations(updateProfileValidator),
  asyncHandler(updateProfile)
);

router.put(
  '/change-password',
  authenticate,
  runValidations(changePasswordValidator),
  asyncHandler(changePassword)
);

router.post('/refresh-token', authenticate, asyncHandler(refreshToken));

export default router;