import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { creatorOnly, anyRole } from '../../middleware/role';
import { paymentLimiter } from '../../middleware/rateLimiter';
import { runValidations } from '../../middleware/validator';
import {
  initializePayment,
  verifyPayment,
  getPaymentHistory,
  getPaymentById,
  getCreatorPaymentStats,
  handlePaystackWebhook,
} from './payments.controller';
import {
  initializePaymentValidator,
  verifyPaymentValidator,
  getPaymentHistoryValidator,
  paymentIdParamValidator,
  creatorStatsValidator,
} from './payments.validator';

const router = Router();

// Webhook route (no auth required)
router.post('/webhook', asyncHandler(handlePaystackWebhook));

// User payment routes
router.post(
  '/initialize',
  authenticate,
  anyRole,
  paymentLimiter,
  runValidations(initializePaymentValidator),
  asyncHandler(initializePayment)
);

router.get(
  '/verify/:reference',
  authenticate,
  anyRole,
  runValidations(verifyPaymentValidator),
  asyncHandler(verifyPayment)
);

router.get(
  '/history',
  authenticate,
  anyRole,
  runValidations(getPaymentHistoryValidator),
  asyncHandler(getPaymentHistory)
);

router.get(
  '/:id',
  authenticate,
  anyRole,
  runValidations(paymentIdParamValidator),
  asyncHandler(getPaymentById)
);

// Creator payment stats
router.get(
  '/creator/stats',
  authenticate,
  creatorOnly,
  runValidations(creatorStatsValidator),
  asyncHandler(getCreatorPaymentStats)
);

export default router;