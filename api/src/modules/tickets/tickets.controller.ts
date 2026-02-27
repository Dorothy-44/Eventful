import { Request, Response } from 'express';
import prisma from '../../config/database';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { generateQRCode } from '../qrcode/qrcode.service';
import { v4 as uuidv4 } from 'uuid';
import { deleteCache, deleteCachePattern } from '../../utils/cache';

/**
 * Purchase ticket (Eventee)
 */
export const purchaseTicket = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { eventId } = req.body;

  // Get event details
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return notFoundResponse(res, 'Event not found');
  }

  if (!event.isActive) {
    return errorResponse(res, 'This event is no longer active', 400);
  }

  if (event.availableTickets <= 0) {
    return errorResponse(res, 'No tickets available for this event', 400);
  }

  if (new Date(event.eventDate) <= new Date()) {
    return errorResponse(res, 'Cannot purchase tickets for past events', 400);
  }

  // Check if user already has a ticket for this event
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      userId,
      eventId,
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
    },
  });

  if (existingTicket) {
    return errorResponse(res, 'You already have a ticket for this event', 400);
  }

  // Generate unique ticket number
  const ticketNumber = `TKT-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

  // Generate QR code data
  const qrData = JSON.stringify({
    ticketNumber,
    eventId,
    userId,
    timestamp: Date.now(),
  });

  const qrCode = await generateQRCode(qrData);

  // Create ticket with pending status
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      qrCode,
      status: 'PENDING',
      userId,
      eventId,
    },
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
  });

  // Return ticket with payment reference
  // Frontend will initiate Paystack payment
  return successResponse(
    res,
    'Ticket reserved. Please complete payment.',
    {
      ticket,
      paymentReference: ticketNumber,
      amount: event.ticketPrice,
    },
    201
  );
};

/**
 * Get user's tickets
 */
export const getMyTickets = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { status, page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  const total = await prisma.ticket.count({ where });

  const tickets = await prisma.ticket.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: { purchaseDate: 'desc' },
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
          creator: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
          reference: true,
          createdAt: true,
        },
      },
    },
  });

  const result = {
    tickets,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  return successResponse(res, 'Tickets retrieved successfully', result);
};

/**
 * Get single ticket by ID
 */
export const getTicketById = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
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
          creator: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
          reference: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) {
    return notFoundResponse(res, 'Ticket not found');
  }

  // Users can only view their own tickets
  if (ticket.userId !== userId) {
    return errorResponse(res, 'You can only view your own tickets', 403);
  }

  return successResponse(res, 'Ticket retrieved successfully', ticket);
};

/**
 * Get upcoming events with tickets
 */
export const getMyUpcomingEvents = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;

  const tickets = await prisma.ticket.findMany({
    where: {
      userId,
      status: {
        in: ['CONFIRMED', 'PENDING'],
      },
      event: {
        eventDate: {
          gte: new Date(),
        },
        isActive: true,
      },
    },
    orderBy: {
      event: {
        eventDate: 'asc',
      },
    },
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
          creator: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  return successResponse(res, 'Upcoming events retrieved successfully', tickets);
};

/**
 * Cancel ticket (before event date)
 */
export const cancelTicket = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      event: true,
    },
  });

  if (!ticket) {
    return notFoundResponse(res, 'Ticket not found');
  }

  if (ticket.userId !== userId) {
    return errorResponse(res, 'You can only cancel your own tickets', 403);
  }

  if (ticket.status === 'CANCELLED') {
    return errorResponse(res, 'Ticket is already cancelled', 400);
  }

  if (ticket.status === 'USED') {
    return errorResponse(res, 'Cannot cancel a used ticket', 400);
  }

  if (new Date(ticket.event.eventDate) <= new Date()) {
    return errorResponse(res, 'Cannot cancel tickets for past events', 400);
  }

  // Update ticket status
  const updatedTicket = await prisma.$transaction(async (tx) => {
    // Cancel ticket
    const cancelledTicket = await tx.ticket.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Increase available tickets
    await tx.event.update({
      where: { id: ticket.eventId },
      data: {
        availableTickets: {
          increment: 1,
        },
      },
    });

    return cancelledTicket;
  });

  // Clear cache
  await deleteCachePattern('events:*');
  await deleteCache(`event:${ticket.eventId}`);

  return successResponse(res, 'Ticket cancelled successfully', updatedTicket);
};

/**
 * Get attendees for an event (Creator only)
 */
export const getEventAttendees = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user!.userId;
  const { eventId } = req.params;
  const { status, page = 1, limit = 10 } = req.query;

  // Check if event belongs to creator
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return notFoundResponse(res, 'Event not found');
  }

  if (event.creatorId !== creatorId) {
    return errorResponse(res, 'You can only view attendees for your own events', 403);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { eventId };

  if (status) {
    where.status = status;
  }

  const total = await prisma.ticket.count({ where });

  const attendees = await prisma.ticket.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: { purchaseDate: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      payment: {
        select: {
          amount: true,
          status: true,
          reference: true,
        },
      },
    },
  });

  const result = {
    attendees,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
    stats: {
      totalAttendees: total,
      confirmed: await prisma.ticket.count({
        where: { eventId, status: 'CONFIRMED' },
      }),
      pending: await prisma.ticket.count({
        where: { eventId, status: 'PENDING' },
      }),
      used: await prisma.ticket.count({
        where: { eventId, status: 'USED' },
      }),
      cancelled: await prisma.ticket.count({
        where: { eventId, status: 'CANCELLED' },
      }),
    },
  };

  return successResponse(res, 'Attendees retrieved successfully', result);
};

/**
 * Get ticket statistics for creator
 */
export const getTicketStats = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user!.userId;
  const { eventId } = req.params;

  // Check if event belongs to creator
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return notFoundResponse(res, 'Event not found');
  }

  if (event.creatorId !== creatorId) {
    return errorResponse(res, 'You can only view stats for your own events', 403);
  }

  const stats = {
    totalTickets: event.totalTickets,
    availableTickets: event.availableTickets,
    soldTickets: event.totalTickets - event.availableTickets,
    ticketsSold: await prisma.ticket.count({
      where: { eventId, status: { in: ['CONFIRMED', 'USED'] } },
    }),
    ticketsPending: await prisma.ticket.count({
      where: { eventId, status: 'PENDING' },
    }),
    ticketsUsed: await prisma.ticket.count({
      where: { eventId, status: 'USED' },
    }),
    ticketsCancelled: await prisma.ticket.count({
      where: { eventId, status: 'CANCELLED' },
    }),
    totalRevenue: await prisma.payment.aggregate({
      where: {
        ticket: {
          eventId,
        },
        status: 'success',
      },
      _sum: {
        amount: true,
      },
    }),
  };

  return successResponse(res, 'Ticket statistics retrieved successfully', stats);
};