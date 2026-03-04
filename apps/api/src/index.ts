import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth';
import analyticsRouter from './routes/analytics';
import propertiesRouter from './routes/properties';
import vendorsRouter from './routes/vendors';
import assignmentsRouter from './routes/assignments';
import communityRouter from './routes/community';
import paymentsRouter from './routes/payments';
import { authMiddleware } from './middleware/auth';
import { rateLimit } from './middleware/rateLimit';
import { logger } from './middleware/logger';
import { sendSMS } from './services/sms';

dotenv.config();

const app = express();

// Logging middleware
app.use(logger);
const prisma = new PrismaClient();
const server = createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Raw body for Paystack webhook
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Attach io to req
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Fie Wura API' });
});

app.use('/api/auth', authRouter);

// Apply rate limiting and auth middleware to all other API routes
app.use('/api', rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
app.use('/api', authMiddleware);

app.use('/api/analytics', analyticsRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/community', communityRouter);
app.use('/api/payments', paymentsRouter);

// Socket
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join community room for property forum/chat
  socket.on('join-community-room', (data: { propertyId: string }) => {
    socket.join(`community-${data.propertyId}`);
    console.log(`User ${socket.id} joined community-${data.propertyId}`);
  });

  // Leave community room
  socket.on('leave-community-room', (data: { propertyId: string }) => {
    socket.leave(`community-${data.propertyId}`);
    console.log(`User ${socket.id} left community-${data.propertyId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Automated SMS reminders
cron.schedule('0 9 * * *', async () => { // Daily at 9 AM
  console.log('Sending SMS reminders...');

  try {
    // Rent due reminders (due in 3 days)
    const dueIn3Days = new Date();
    dueIn3Days.setDate(dueIn3Days.getDate() + 3);

    const duePayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          gte: new Date(),
          lte: dueIn3Days
        }
      },
      include: {
        lease: {
          include: {
            tenant: {
              include: { user: true }
            }
          }
        }
      }
    });

    for (const payment of duePayments) {
      const phone = payment.lease.tenant.user.phone;
      if (phone) {
        const message = `Fiewura Reminder: Your rent of GHS ${payment.amount} is due on ${payment.dueDate.toDateString()}. Please pay to avoid penalties.`;
        await sendSMS(phone, message);
      }
    }

    // Overdue rent reminders
    const overduePayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: new Date() }
      },
      include: {
        lease: {
          include: {
            tenant: {
              include: { user: true }
            }
          }
        }
      }
    });

    for (const payment of overduePayments) {
      const phone = payment.lease.tenant.user.phone;
      if (phone) {
        const message = `Fiewura Overdue: Your rent of GHS ${payment.amount} was due on ${payment.dueDate.toDateString()}. Please pay immediately to avoid eviction.`;
        await sendSMS(phone, message);
      }
    }

    // Maintenance status updates (recent changes)
    const recentMaintenances = await prisma.maintenance.findMany({
      where: {
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24 hours
        status: { in: ['IN_PROGRESS', 'COMPLETED'] }
      },
      include: {
        property: true,
        tenant: { include: { user: true } }
      }
    });

    for (const maint of recentMaintenances) {
      const phone = maint.tenant?.user.phone;
      if (phone) {
        const message = `Fiewura Update: Maintenance request for ${maint.property.address} is now ${maint.status.toLowerCase().replace('_', ' ')}. Description: ${maint.description}`;
        await sendSMS(phone, message);
      }
    }

    console.log('SMS reminders sent.');
  } catch (error) {
    console.error('Error sending SMS reminders:', error);
  }
});