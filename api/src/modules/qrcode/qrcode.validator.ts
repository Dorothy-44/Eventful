import { body, param } from 'express-validator';

/**
 * Validates the data sent when scanning a QR code
 * This matches 'scanQRValidator' in your route file
 */
export const scanQRValidator = [
  body('qrData')
    .notEmpty()
    .withMessage('QR data is required')
];

/**
 * Validates the ticketId passed in the URL params
 * This matches 'ticketIdValidator' in your route file
 */
export const ticketIdValidator = [
  param('ticketId')
    .isUUID()
    .withMessage('Invalid ticket ID format')
];