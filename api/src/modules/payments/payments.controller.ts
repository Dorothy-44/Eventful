import { Request, Response } from 'express';
import prisma from '../../config/database';
import paystackService from '../../config/paystack';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { deleteCache, deleteCachePattern } from '../../utils/cache';

/**
 * Initialize payment
 */
export const initializePayment = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { ticketId } = req.body;

  // Get ticket details
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      event: true,
      user: true,
    },
  });

  if (!ticket) {
    return notFoundResponse(res, 'Ticket not found');
  }

  if (ticket.userId !== userId) {
    return errorResponse(res, 'You can only pay for your own tickets', 403);
  }

  if (ticket.status === 'CONFIRMED') {
    return errorResponse(res, 'This ticket has already been paid for', 400);
  }

  if (ticket.status === 'CANCELLED') {
    return errorResponse(res, 'Cannot pay for a cancelled ticket', 400);
  }

  // Check if payment already exists
  const existingPayment = await prisma.payment.findUnique({
    where: { ticketId },
  });

  if (existingPayment && existingPayment.status === 'success') {
    return errorResponse(res, 'Payment already completed for this ticket', 400);
  }

  // Convert ticket price to kobo (Paystack uses smallest currency unit)
  const amountInKobo = Math.round(parseFloat(ticket.event.ticketPrice.toString()) * 100);

  try {
    // Initialize Paystack transaction
    const paystackResponse = await paystackService.initializeTransaction({
      email: ticket.user.email,
      amount: amountInKobo,
      reference: ticket.ticketNumber,
      metadata: {
        ticketId: ticket.id,
        eventId: ticket.event.id,
        userId: ticket.userId,
        eventTitle: ticket.event.title,
      },
    });

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { ticketId },
      create: {
        amount: ticket.event.ticketPrice,
        reference: ticket.ticketNumber,
        status: 'pending',
        ticketId: ticket.id,
        paystackResponse: paystackResponse as any,
      },
      update: {
        paystackResponse: paystackResponse as any,
        status: 'pending',
      },
    });

    return successResponse(res, 'Payment initialized successfully', {
      payment,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
    });
  } catch (error: any) {
    return errorResponse(res, 'Payment initialization failed', 500, error.message);
  }
};

/**
 * Verify payment (Paystack callback)
 */
export const verifyPayment = async (req: Request, res: Response): Promise<Response> => {
  const { reference } = req.params;

  try {
    // Verify transaction with Paystack
    const paystackResponse = await paystackService.verifyTransaction(reference);

    if (!paystackResponse.data) {
      return errorResponse(res, 'Payment verification failed', 400);
    }

    const { status } = paystackResponse.data;

    // Find payment record
    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: {
        ticket: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!payment) {
      return notFoundResponse(res, 'Payment record not found');
    }

    // Check if already processed
    if (payment.status === 'success') {
      return successResponse(res, 'Payment already verified', { payment });
    }

    // Verify payment was successful
    if (status !== 'success') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          paystackResponse: paystackResponse as any,
        },
      });

      return errorResponse(res, 'Payment was not successful', 400);
    }

    // Update payment and ticket in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          paystackResponse: paystackResponse as any,
        },
      });

      // Update ticket status
      const updatedTicket = await tx.ticket.update({
        where: { id: payment.ticketId },
        data: {
          status: 'CONFIRMED',
        },
      });

      // Decrease available tickets
      await tx.event.update({
        where: { id: payment.ticket.eventId },
        data: {
          availableTickets: {
            decrement: 1,
          },
        },
      });

      // Create notification for user
      await tx.notification.create({
        data: {
          type: 'TICKET_PURCHASED',
          title: 'Ticket Purchased',
          message: `Your ticket for "${payment.ticket.event.title}" has been confirmed!`,
          userId: payment.ticket.userId,
          eventId: payment.ticket.eventId,
        },
      });

      return { payment: updatedPayment, ticket: updatedTicket };
    });

    // Clear cache
    await deleteCachePattern('events:*');
    await deleteCache(`event:${payment.ticket.eventId}`);

    return successResponse(res, 'Payment verified successfully', result);
  } catch (error: any) {
    return errorResponse(res, 'Payment verification failed', 500, error.message);
  }
};

/**
 * Get payment history for user
 */
export const getPaymentHistory = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { page = 1, limit = 10, status } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    ticket: {
      userId,
    },
  };

  if (status) {
    where.status = status;
  }

  const total = await prisma.payment.count({ where });

  const payments = await prisma.payment.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: { createdAt: 'desc' },
    include: {
      ticket: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              eventDate: true,
              location: true,
            },
          },
        },
      },
    },
  });

  const result = {
    payments,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  return successResponse(res, 'Payment history retrieved successfully', result);
};

/**
 * Get single payment details
 */
export const getPaymentById = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      ticket: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              eventDate: true,
              ticketPrice: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return notFoundResponse(res, 'Payment not found');
  }

  if (payment.ticket.userId !== userId) {
    return errorResponse(res, 'You can only view your own payments', 403);
  }

  return successResponse(res, 'Payment details retrieved successfully', payment);
};

/**
 * Get payment statistics for creator
 */
export const getCreatorPaymentStats = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user!.userId;
  const { eventId } = req.query;

  const where: any = {
    ticket: {
      event: {
        creatorId,
      },
    },
    status: 'success',
  };

  if (eventId) {
    where.ticket.eventId = eventId;
  }

  const stats = {
    totalRevenue: await prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),
    totalPayments: await prisma.payment.count({ where }),
    successfulPayments: await prisma.payment.count({
      where: { ...where, status: 'success' },
    }),
    pendingPayments: await prisma.payment.count({
      where: {
        ticket: {
          event: {
            creatorId,
          },
        },
        status: 'pending',
      },
    }),
    failedPayments: await prisma.payment.count({
      where: {
        ticket: {
          event: {
            creatorId,
          },
        },
        status: 'failed',
      },
    }),
  };

  // Get revenue breakdown by event
  const revenueByEvent = await prisma.payment.groupBy({
    by: ['ticketId'],
    where,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  // Get event details for revenue breakdown
  const eventRevenue = await Promise.all(
    revenueByEvent.map(async (item) => {
      const ticket = await prisma.ticket.findUnique({
        where: { id: item.ticketId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return {
        eventId: ticket?.event.id,
        eventTitle: ticket?.event.title,
        revenue: item._sum.amount,
        ticketsSold: item._count.id,
      };
    })
  );

  return successResponse(res, 'Payment statistics retrieved successfully', {
    ...stats,
    revenueByEvent: eventRevenue,
  });
};

/**
 * Paystack webhook handler
 */
export const handlePaystackWebhook = async (req: Request, res: Response): Promise<Response> => {
  const event = req.body;

  // Verify webhook signature (recommended in production)
  // const signature = req.headers['x-paystack-signature'];

  if (event.event === 'charge.success') {
    const { reference, status } = event.data;

    try {
      const payment = await prisma.payment.findUnique({
        where: { reference },
        include: {
          ticket: {
            include: {
              event: true,
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (payment.status === 'success') {
        return res.status(200).json({ message: 'Already processed' });
      }

      if (status === 'success') {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'success',
              paystackResponse: event.data as any,
            },
          });

          await tx.ticket.update({
            where: { id: payment.ticketId },
            data: { status: 'CONFIRMED' },
          });

          await tx.event.update({
            where: { id: payment.ticket.eventId },
            data: {
              availableTickets: {
                decrement: 1,
              },
            },
          });

          await tx.notification.create({
            data: {
              type: 'TICKET_PURCHASED',
              title: 'Ticket Purchased',
              message: `Your ticket for "${payment.ticket.event.title}" has been confirmed!`,
              userId: payment.ticket.userId,
              eventId: payment.ticket.eventId,
            },
          });
        });

        // Clear cache
        await deleteCachePattern('events:*');
        await deleteCache(`event:${payment.ticket.eventId}`);
      }

      return res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ message: 'Webhook processing failed' });
    }
  }

  return res.status(200).json({ message: 'Event received' });
};