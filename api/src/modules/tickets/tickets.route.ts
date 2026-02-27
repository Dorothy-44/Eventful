import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { creatorOnly, anyRole } from '../../middleware/role';
import { runValidations } from '../../middleware/validator';
import {
  purchaseTicket,
  getMyTickets,
  getTicketById,
  getMyUpcomingEvents,
  cancelTicket,
  getEventAttendees,
  getTicketStats,
} from './tickets.controller';
import {
  purchaseTicketValidator,
  getTicketsQueryValidator,
  eventIdParamValidator,
  ticketIdParamValidator,
} from './tickets.validator';

const router = Router();

// Eventee routes
router.post(
  '/purchase',
  authenticate,
  anyRole,
  runValidations(purchaseTicketValidator),
  asyncHandler(purchaseTicket)
);

router.get(
  '/my-tickets',
  authenticate,
  anyRole,
  runValidations(getTicketsQueryValidator),
  asyncHandler(getMyTickets)
);

router.get(
  '/my-upcoming',
  authenticate,
  anyRole,
  asyncHandler(getMyUpcomingEvents)
);

router.get(
  '/:id',
  authenticate,
  anyRole,
  runValidations(ticketIdParamValidator),
  asyncHandler(getTicketById)
);

router.delete(
  '/:id',
  authenticate,
  anyRole,
  runValidations(ticketIdParamValidator),
  asyncHandler(cancelTicket)
);

// Creator routes
router.get(
  '/event/:eventId/attendees',
  authenticate,
  creatorOnly,
  runValidations([...eventIdParamValidator, ...getTicketsQueryValidator]),
  asyncHandler(getEventAttendees)
);

router.get(
  '/event/:eventId/stats',
  authenticate,
  creatorOnly,
  runValidations(eventIdParamValidator),
  asyncHandler(getTicketStats)
);

export default router;