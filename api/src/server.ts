import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { startReminderJob } from './jobs/reminderJob';
// --- ADD THIS IMPORT BELOW ---
import prisma from './config/database'; 

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`
      🎉 Groove API Server Running 🎉   
                                        
    Environment: ${process.env.NODE_ENV || 'development'}
    Port: ${PORT}                        
    URL: http://localhost:${PORT}      
  `);

  async function wakeUpDatabase() {
    try {
      // This "pings" Neon to wake it up
      await prisma.$queryRaw`SELECT 1`; 
      console.log('✅ Database is awake and ready!');
    } catch (e) {
      console.log('⏳ Database is waking up, retrying in 2s...');
      // Retrying ensures your instructor doesn't see a crash if the DB is cold
      setTimeout(wakeUpDatabase, 2000);
    }
  }

  wakeUpDatabase();

  // Start reminder job
  startReminderJob();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect(); // Clean up DB connection
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    await prisma.$disconnect(); // Clean up DB connection
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default server;