import { body, query } from 'express-validator';

/**
 * Create event validation rules
 */
export const createEventValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be 3-200 characters'),

  body('eventDate')
    .notEmpty()
    .withMessage('Event date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const eventDate = new Date(value);
      const now = new Date();
      if (eventDate <= now) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),

  body('ticketPrice')
    .notEmpty()
    .withMessage('Ticket price is required')
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be a positive number'),

  body('totalTickets')
    .notEmpty()
    .withMessage('Total tickets is required')
    .isInt({ min: 1 })
    .withMessage('Total tickets must be at least 1'),

  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
];

/**
 * Update event validation rules
 */
export const updateEventValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be 3-200 characters'),

  body('eventDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const eventDate = new Date(value);
      const now = new Date();
      if (eventDate <= now) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),

  body('ticketPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be a positive number'),

  body('totalTickets')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total tickets must be at least 1'),

  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

/**
 * Get events query validation
 */
export const getEventsQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query cannot be empty'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  query('sortBy')
    .optional()
    .isIn(['eventDate', 'createdAt', 'title', 'ticketPrice'])
    .withMessage('Invalid sort field'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
];