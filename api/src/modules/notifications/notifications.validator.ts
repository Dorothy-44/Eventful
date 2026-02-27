import { query, param } from 'express-validator';

/**
 * Get notifications query validation
 */
export const getNotificationsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be a boolean'),
];

/**
 * Notification ID param validation
 */
export const notificationIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid notification ID format'),
];