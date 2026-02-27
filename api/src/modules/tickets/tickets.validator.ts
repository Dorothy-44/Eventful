import { body, query, param } from 'express-validator';

/**
 * Purchase ticket validation
 */
export const purchaseTicketValidator = [
  body('eventId')
    .notEmpty()
    .withMessage('Event ID is required')
    .isUUID()
    .withMessage('Invalid event ID format'),
];

/**
 * Get tickets query validation
 */
export const getTicketsQueryValidator = [
  query('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'USED'])
    .withMessage('Invalid ticket status'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

/**
 * Event ID param validation
 */
export const eventIdParamValidator = [
  param('eventId')
    .isUUID()
    .withMessage('Invalid event ID format'),
];

/**
 * Ticket ID param validation
 */
export const ticketIdParamValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid ticket ID format'),
];