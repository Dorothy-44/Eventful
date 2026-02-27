import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { creatorOnly, anyRole } from '../../middleware/role';
import { qrScanLimiter } from '../../middleware/rateLimiter';
import { runValidations } from '../../middleware/validator';
import {
  scanQRCode,
  getTicketQRCode,
  validateQRCode,
} from './qrcode.controller';
import { scanQRValidator, ticketIdValidator } from './qrcode.validator';

const router = Router();

// Creator routes
router.post(
  '/scan',
  authenticate,
  creatorOnly,
  qrScanLimiter,
  runValidations(scanQRValidator),
  asyncHandler(scanQRCode)
);

router.post(
  '/validate',
  authenticate,
  creatorOnly,
  runValidations(scanQRValidator),
  asyncHandler(validateQRCode)
);

// User routes
router.get(
  '/ticket/:ticketId',
  authenticate,
  anyRole,
  runValidations(ticketIdValidator),
  asyncHandler(getTicketQRCode)
);

export default router;