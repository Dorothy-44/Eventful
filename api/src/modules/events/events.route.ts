import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { creatorOnly } from '../../middleware/role';
import { eventCreationLimiter } from '../../middleware/rateLimiter';
import { runValidations } from '../../middleware/validator';
import {
  createEvent,
  getAllEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
} from './events.controller';
import {
  createEventValidator,
  updateEventValidator,
  getEventsQueryValidator,
} from './events.validator';

const router = Router();

// Public routes
router.get(
  '/',
  runValidations(getEventsQueryValidator),
  asyncHandler(getAllEvents)
);

router.get('/upcoming', asyncHandler(getUpcomingEvents));

router.get('/:id', asyncHandler(getEventById));

// Protected routes - Creator only
router.post(
  '/',
  authenticate,
  creatorOnly,
  eventCreationLimiter,
  runValidations(createEventValidator),
  asyncHandler(createEvent)
);

router.get(
  '/my/events',
  authenticate,
  creatorOnly,
  asyncHandler(getMyEvents)
);

router.put(
  '/:id',
  authenticate,
  creatorOnly,
  runValidations(updateEventValidator),
  asyncHandler(updateEvent)
);

router.delete(
  '/:id',
  authenticate,
  creatorOnly,
  asyncHandler(deleteEvent)
);

export default router;