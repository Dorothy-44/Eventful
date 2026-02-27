import cron from 'node-cron';
import prisma from '../config/database';

/**
 * Check and send reminders for upcoming events
 */
const checkReminders = async () => {
  try {
    const now = new Date();
    
    // Calculate dates for 3 days and 1 day ahead
    const threeDaysAhead = new Date(now);
    threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);
    threeDaysAhead.setHours(0, 0, 0, 0);

    const threeDaysAheadEnd = new Date(threeDaysAhead);
    threeDaysAheadEnd.setHours(23, 59, 59, 999);

    const oneDayAhead = new Date(now);
    oneDayAhead.setDate(oneDayAhead.getDate() + 1);
    oneDayAhead.setHours(0, 0, 0, 0);

    const oneDayAheadEnd = new Date(oneDayAhead);
    oneDayAheadEnd.setHours(23, 59, 59, 999);

    // Get events happening in 3 days
    const eventsIn3Days = await prisma.event.findMany({
      where: {
        eventDate: {
          gte: threeDaysAhead,
          lte: threeDaysAheadEnd,
        },
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
        tickets: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING'],
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    // Get events happening in 1 day
    const eventsIn1Day = await prisma.event.findMany({
      where: {
        eventDate: {
          gte: oneDayAhead,
          lte: oneDayAheadEnd,
        },
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
        tickets: {
          where: {
            status: {
              in: ['CONFIRMED', 'PENDING'],
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    // Send 3-day reminders
    for (const event of eventsIn3Days) {
      // Check if reminder already sent
      const existingReminder = await prisma.notification.findFirst({
        where: {
          eventId: event.id,
          type: 'REMINDER_3_DAYS',
          userId: event.creatorId,
        },
      });

      if (!existingReminder) {
        // Send to creator
        await prisma.notification.create({
          data: {
            type: 'REMINDER_3_DAYS',
            title: 'Event Reminder - 3 Days',
            message: `Your event "${event.title}" is happening in 3 days!`,
            userId: event.creatorId,
            eventId: event.id,
            sentAt: new Date(),
          },
        });

        // Send to all ticket holders
        const userIds = [...new Set(event.tickets.map((t) => t.userId))];
        const notifications = userIds.map((userId) => ({
          type: 'REMINDER_3_DAYS' as const,
          title: 'Event Reminder - 3 Days',
          message: `"${event.title}" is happening in 3 days! Don't forget to attend.`,
          userId,
          eventId: event.id,
          sentAt: new Date(),
        }));

        if (notifications.length > 0) {
          await prisma.notification.createMany({
            data: notifications,
            skipDuplicates: true,
          });
        }

        console.log(`✅ 3-day reminder sent for event: ${event.title}`);
      }
    }

    // Send 1-day reminders
    for (const event of eventsIn1Day) {
      const existingReminder = await prisma.notification.findFirst({
        where: {
          eventId: event.id,
          type: 'REMINDER_1_DAY',
          userId: event.creatorId,
        },
      });

      if (!existingReminder) {
        // Send to creator
        await prisma.notification.create({
          data: {
            type: 'REMINDER_1_DAY',
            title: 'Event Reminder - Tomorrow',
            message: `Your event "${event.title}" is tomorrow! Make sure everything is ready.`,
            userId: event.creatorId,
            eventId: event.id,
            sentAt: new Date(),
          },
        });

        // Send to all ticket holders
        const userIds = [...new Set(event.tickets.map((t) => t.userId))];
        const notifications = userIds.map((userId) => ({
          type: 'REMINDER_1_DAY' as const,
          title: 'Event Reminder - Tomorrow',
          message: `"${event.title}" is tomorrow! See you there.`,
          userId,
          eventId: event.id,
          sentAt: new Date(),
        }));

        if (notifications.length > 0) {
          await prisma.notification.createMany({
            data: notifications,
            skipDuplicates: true,
          });
        }

        console.log(`✅ 1-day reminder sent for event: ${event.title}`);
      }
    }
  } catch (error) {
    console.error('❌ Error in reminder job:', error);
  }
};

/**
 * Schedule reminder job to run every day at 9:00 AM
 */
export const startReminderJob = () => {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running reminder job...');
    await checkReminders();
  });

  console.log('✅ Reminder job scheduled (runs daily at 9:00 AM)');
};

// Export for manual testing
export { checkReminders };