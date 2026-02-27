import { Request, Response } from 'express';
import prisma from '../../config/database';
import { successResponse } from '../../utils/response';

/**
 * Get general analytics for a creator
 */
export const getCreatorAnalytics = async (req: Request, res: Response) => {
  const creatorId = req.user!.userId;

  // Get total revenue and tickets sold for all events by this creator
  const stats = await prisma.payment.aggregate({
    where: {
      status: 'success',
      ticket: {
        event: {
          creatorId
        }
      }
    },
    _sum: {
      amount: true
    },
    _count: {
      id: true
    }
  });

  return successResponse(res, 'Creator analytics retrieved successfully', {
    totalRevenue: stats._sum.amount || 0,
    totalTicketsSold: stats._count.id || 0,
  });
};

/**
 * Get specific analytics for a single event
 */
export const getEventAnalytics = async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const eventStats = await prisma.ticket.groupBy({
    by: ['status'],
    where: { eventId },
    _count: {
      id: true
    }
  });

  return successResponse(res, 'Event analytics retrieved successfully', {
    eventId,
    breakdown: eventStats
  });
};