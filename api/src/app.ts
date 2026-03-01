import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFound } from './middleware/errorHandler';
//import { generalLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './modules/auth/auth.route';
import eventRoutes from './modules/events/events.route';
import ticketRoutes from './modules/tickets/tickets.route';
import paymentRoutes from './modules/payments/payments.route';
import qrcodeRoutes from './modules/qrcode/qrcode.route';
import notificationRoutes from './modules/notifications/notifications.route';
import analyticsRoutes from './modules/analytics/analytics.route';

const app: Application = express();

// 1. Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows images/resources to load across origins
}));

// 2. UPDATED CORS: This is the "Security Pass" for your Frontend
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173', 
      'http://127.0.0.1:5173',
      'http://localhost:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}



// Health check
// 5. Base Route & Health Check
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Groove API! 🥳',
    version: '1.0.0',
    status: 'Operational'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Groove API is running',
    timestamp: new Date().toISOString(),
  });
});

// 6. API routes (Prefixed with /api)
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qrcode', qrcodeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;