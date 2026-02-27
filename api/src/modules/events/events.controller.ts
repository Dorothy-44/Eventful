import { Request, Response } from 'express';
import prisma from '../../config/database';
import { successResponse, errorResponse, notFoundResponse } from '../../utils/response';
import { deleteCache, deleteCachePattern, getCache, setCache } from '../../utils/cache';

/**
 * Create a new event (Creator only)
 */
export const createEvent = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user!.userId;
  const {
    title,
    description,
    location,
    eventDate,
    ticketPrice,
    totalTickets,
    imageUrl,
  } = req.body;

  const event = await prisma.event.create({
    data: {
      title,
      description,
      location,
      eventDate: new Date(eventDate),
      ticketPrice,
      totalTickets,
      availableTickets: totalTickets,
      imageUrl,
      creatorId,
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Clear events cache
  await deleteCachePattern('events:*');

  // Create notification for creator
  await prisma.notification.create({
    data: {
      type: 'EVENT_CREATED',
      title: 'Event Created',
      message: `Your event "${title}" has been created successfully`,
      userId: creatorId,
      eventId: event.id,
    },
  });

  return successResponse(res, 'Event created successfully', event, 201);
};

/**
 * Get all events (with pagination and filters)
 */
export const getAllEvents = async (req: Request, res: Response): Promise<Response> => {
  const {
    page = 1,
    limit = 10,
    search,
    isActive,
    sortBy = 'eventDate',
    order = 'asc',
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Build cache key
  const cacheKey = `events:all:${page}:${limit}:${search || ''}:${isActive || ''}:${sortBy}:${order}`;

  // Check cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return successResponse(res, 'Events retrieved successfully (cached)', cached);
  }

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { location: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  // Get total count
  const total = await prisma.event.count({ where });

  // Get events
  const events = await prisma.event.findMany({
    where,
    skip,
    take: limitNum,
    orderBy: { [sortBy as string]: order },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  const result = {
    events,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  // Cache for 5 minutes
  await setCache(cacheKey, result, 300);

  return successResponse(res, 'Events retrieved successfully', result);
};

/**
 * Get single event by ID
 */
export const getEventById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  // Check cache
  const cacheKey = `event:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return successResponse(res, 'Event retrieved successfully (cached)', cached);
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  if (!event) {
    return notFoundResponse(res, 'Event not found');
  }

  // Cache for 5 minutes
  await setCache(cacheKey, event, 300);

  return successResponse(res, 'Event retrieved successfully', event);
};

/**
 * Get events created by current user (Creator only)
 */
export const getMyEvents = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user!.userId;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const total = await prisma.event.count({ where: { creatorId } });

  const events = await prisma.event.findMany({
    where: { creatorId },
    skip,
    take: limitNum,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  const result = {
    events,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  return successResponse(res, 'Your events retrieved successfully', result);
};

/**
 * Update event (Creator only - own events)
 */
export const updateEvent = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const creatorId = req.user!.userId;
  const {
    title,
    description,
    location,
    eventDate,
    ticketPrice,
    totalTickets,
    imageUrl,
    isActive,
  } = req.body;

  // Check if event exists and belongs to creator
  const existingEvent = await prisma.event.findUnique({
    where: { id },
  });

  if (!existingEvent) {
    return notFoundResponse(res, 'Event not found');
  }

  if (existingEvent.creatorId !== creatorId) {
    return errorResponse(res, 'You can only update your own events', 403);
  }

  // Calculate new available tickets if total changed
  let availableTickets = existingEvent.availableTickets;
  if (totalTickets !== undefined) {
    const ticketsSold = existingEvent.totalTickets - existingEvent.availableTickets;
    availableTickets = totalTickets - ticketsSold;

    if (availableTickets < 0) {
      return errorResponse(
        res,
        'Cannot reduce total tickets below number of tickets sold',
        400
      );
    }
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      title,
      description,
      location,
      eventDate: eventDate ? new Date(eventDate) : undefined,
      ticketPrice,
      totalTickets,
      availableTickets,
      imageUrl,
      isActive,
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Clear cache
  await deleteCache(`event:${id}`);
  await deleteCachePattern('events:*');

  // Notify ticket holders of update
  const tickets = await prisma.ticket.findMany({
    where: { eventId: id },
    select: { userId: true },
  });

  const notificationPromises = tickets.map((ticket) =>
    prisma.notification.create({
      data: {
        type: 'EVENT_UPDATED',
        title: 'Event Updated',
        message: `The event "${event.title}" has been updated`,
        userId: ticket.userId,
        eventId: id,
      },
    })
  );

  await Promise.all(notificationPromises);

  return successResponse(res, 'Event updated successfully', event);
};

/**
 * Delete event (Creator only - own events)
 */
export const deleteEvent = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const creatorId = req.user!.userId;

  // Check if event exists and belongs to creator
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  if (!event) {
    return notFoundResponse(res, 'Event not found');
  }

  if (event.creatorId !== creatorId) {
    return errorResponse(res, 'You can only delete your own events', 403);
  }

  // Check if there are sold tickets
  if (event._count.tickets > 0) {
    return errorResponse(
      res,
      'Cannot delete event with sold tickets. Set it as inactive instead.',
      400
    );
  }

  await prisma.event.delete({
    where: { id },
  });

  // Clear cache
  await deleteCache(`event:${id}`);
  await deleteCachePattern('events:*');

  return successResponse(res, 'Event deleted successfully');
};

/**
 * Get upcoming events
 */
export const getUpcomingEvents = async (req: Request, res: Response): Promise<Response> => {
  const { limit = 10 } = req.query;
  const limitNum = parseInt(limit as string);

  const cacheKey = `events:upcoming:${limit}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return successResponse(res, 'Upcoming events retrieved (cached)', cached);
  }

  const events = await prisma.event.findMany({
    where: {
      eventDate: {
        gte: new Date(),
      },
      isActive: true,
      availableTickets: {
        gt: 0,
      },
    },
    take: limitNum,
    orderBy: {
      eventDate: 'asc',
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  // Cache for 5 minutes
  await setCache(cacheKey, events, 300);

  return successResponse(res, 'Upcoming events retrieved successfully', events);
};