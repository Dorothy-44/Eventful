import { Request, Response } from 'express';
import prisma from '../../config/database';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';

/**
 * Get user notifications
 */
export const getNotifications = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { page = 1, limit = 20, isRead } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { userId };

  if (isRead !== undefined) {
    where.isRead = isRead === 'true';
  }

  const total = await prisma.notification.count({ where });

  const notifications = await prisma.notification.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: { createdAt: 'desc' },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          eventDate: true,
        },
      },
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  const result = {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  return successResponse(res, 'Notifications retrieved successfully', result);
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    return notFoundResponse(res, 'Notification not found');
  }

  if (notification.userId !== userId) {
    return errorResponse(res, 'You can only mark your own notifications as read', 403);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return successResponse(res, 'Notification marked as read', updated);
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;

  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return successResponse(res, 'All notifications marked as read');
};

/**
 * Delete notification
 */
export const deleteNotification = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    return notFoundResponse(res, 'Notification not found');
  }

  if (notification.userId !== userId) {
    return errorResponse(res, 'You can only delete your own notifications', 403);
  }

  await prisma.notification.delete({
    where: { id },
  });

  return successResponse(res, 'Notification deleted successfully');
};

/**
 * Get unread count
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;

  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return successResponse(res, 'Unread count retrieved', { count });
};