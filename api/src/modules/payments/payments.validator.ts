import { body, query, param } from 'express-validator';

/**
 * Initialize payment validation
 */
export const initializePaymentValidator = [
  body('ticketId')
    .notEmpty()
    .withMessage('Ticket ID is required')
    .isUUID()
    .withMessage('Invalid ticket ID format'),
];

/**
 * Verify payment validation
 */
export const verifyPaymentValidator = [
  param('reference')
    .notEmpty()
    .withMessage('Payment reference is required')
    .isString()
    .withMessage('Invalid reference format'),
];

/**
 * Get payment history validation
 */
export const getPaymentHistoryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['pending', 'success', 'failed'])
    .withMessage('Invalid payment status'),
];

/**
 * Payment ID param validation
 */
export const paymentIdParamValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid payment ID format'),
];

/**
 * Creator stats validation
 */
export const creatorStatsValidator = [
  query('eventId')
    .optional()
    .isUUID()
    .withMessage('Invalid event ID format'),
];