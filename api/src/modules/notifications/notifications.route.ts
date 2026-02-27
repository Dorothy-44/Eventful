import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { anyRole } from '../../middleware/role';
import { runValidations } from '../../middleware/validator';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from './notifications.controller';
import {
  getNotificationsValidator,
  notificationIdValidator,
} from './notifications.validator';

const router = Router();

router.get(
  '/',
  authenticate,
  anyRole,
  runValidations(getNotificationsValidator),
  asyncHandler(getNotifications)
);

router.get(
  '/unread-count',
  authenticate,
  anyRole,
  asyncHandler(getUnreadCount)
);

router.put(
  '/:id/read',
  authenticate,
  anyRole,
  runValidations(notificationIdValidator),
  asyncHandler(markAsRead)
);

router.put(
  '/mark-all-read',
  authenticate,
  anyRole,
  asyncHandler(markAllAsRead)
);

router.delete(
  '/:id',
  authenticate,
  anyRole,
  runValidations(notificationIdValidator),
  asyncHandler(deleteNotification)
);

export default router;