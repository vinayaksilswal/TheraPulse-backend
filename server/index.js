import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
import prisma from './db.js';

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routers (we will create these next)
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import paypalRouter from './routes/paypal.js';
import warriorplusRouter from './routes/warriorplus.js';
import metaRouter from './routes/meta.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import abandonedCartRouter from './routes/abandoned_cart.js';
import mediaRouter from './routes/media.js';

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/paypal', paypalRouter);
app.use('/api/warriorplus', warriorplusRouter);
app.use('/api/meta', metaRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/cart/abandoned', abandonedCartRouter);
app.use('/api/v1/media', mediaRouter);

// Cron Jobs
cron.schedule('0 * * * *', async () => {
  console.log('[Cron] Running Abandoned Cart Recovery check');
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const staleCarts = await prisma.abandonedCart.findMany({
      where: {
        recovered: false,
        updatedAt: { lte: oneHourAgo }
      }
    });

    for (const cart of staleCarts) {
      console.log(`[Cron] Would send recovery email to: ${cart.email}`);
      // Send email via nodemailer or external service here
      // Mark as recovered or track email sent status to prevent spamming
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { recovered: true }
      });
    }
  } catch (err) {
    console.error('[Cron] Abandoned Cart Error:', err);
  }
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });
}

// Start server
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
