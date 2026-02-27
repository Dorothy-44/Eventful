import { Request, Response } from 'express';
import prisma from '../../config/database';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { verifyQRData } from './qrcode.service';

/**
 * Scan and verify QR code (Creator only)
 */
export const scanQRCode = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user!.userId;
  const { qrData } = req.body;

  const verification = verifyQRData(qrData);
  if (!verification.valid) {
    return errorResponse(res, 'Invalid QR code format', 400);
  }

  const { ticketNumber, eventId } = verification;

  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      event: { include: { creator: { select: { id: true, username: true } } } },
      user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      payment: { select: { status: true, amount: true } },
    },
  });

  if (!ticket) return notFoundResponse(res, 'Ticket not found');
  if (ticket.eventId !== eventId) return errorResponse(res, 'Ticket does not match event', 400);
  if (ticket.event.creatorId !== creatorId) return errorResponse(res, 'Unauthorized scanner', 403);
  
  if (ticket.status === 'CANCELLED') return errorResponse(res, 'Ticket cancelled', 400);
  if (ticket.status === 'PENDING') return errorResponse(res, 'Payment pending', 400);
  
  if (ticket.status === 'USED') {
    return successResponse(res, 'Ticket already scanned', { ticket, alreadyScanned: true });
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'USED', scannedAt: new Date() },
  });

  return successResponse(res, 'Ticket scanned successfully', { ticket: updatedTicket, alreadyScanned: false });
};

/**
 * Get QR code for a ticket (User)
 */
export const getTicketQRCode = async (req: Request, res: Response): Promise<Response> => {
  const userId = req.user!.userId;
  const { ticketId } = req.params;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { event: { select: { id: true, title: true, eventDate: true, location: true } } },
  });

  if (!ticket) return notFoundResponse(res, 'Ticket not found');
  if (ticket.userId !== userId) return errorResponse(res, 'Unauthorized', 403);
  if (ticket.status === 'CANCELLED') return errorResponse(res, 'Ticket cancelled', 400);

  return successResponse(res, 'QR code retrieved successfully', {
    qrCode: ticket.qrCode,
    ticketNumber: ticket.ticketNumber,
    event: ticket.event,
    status: ticket.status,
  });
};

/**
 * Validate QR code without marking as used
 */
export const validateQRCode = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user!.userId;
  const { qrData } = req.body;

  const verification = verifyQRData(qrData);
  if (!verification.valid) return errorResponse(res, 'Invalid format', 400);

  const { ticketNumber, eventId } = verification;
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      event: { select: { id: true, title: true, creatorId: true } },
      user: { select: { username: true } },
    },
  });

  if (!ticket || ticket.eventId !== eventId || ticket.event.creatorId !== creatorId) {
    return successResponse(res, 'Validation failed', { valid: false });
  }

  return successResponse(res, 'Validated', { valid: true, ticket });
};