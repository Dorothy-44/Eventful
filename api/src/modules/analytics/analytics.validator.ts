import { query, param } from 'express-validator';

/**
 * Get analytics query validation
 */
export const getAnalyticsValidator = [
  query('eventId')
    .optional()
    .isUUID()
    .withMessage('Invalid event ID format'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
];

/**
 * Event ID param validation
 */
export const eventIdParamValidator = [
  param('eventId')
    .isUUID()
    .withMessage('Invalid event ID format'),
];