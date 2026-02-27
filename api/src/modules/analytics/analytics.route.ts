import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { creatorOnly } from '../../middleware/role';
import { runValidations } from '../../middleware/validator';
import {
  getCreatorAnalytics,
  getEventAnalytics,
} from './analytics.controller';
import {
  getAnalyticsValidator,
  eventIdParamValidator,
} from './analytics.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  creatorOnly,
  runValidations(getAnalyticsValidator),
  asyncHandler(getCreatorAnalytics)
);

router.get(
  '/event/:eventId',
  authenticate,
  creatorOnly,
  runValidations(eventIdParamValidator),
  asyncHandler(getEventAnalytics)
);

export default router;

