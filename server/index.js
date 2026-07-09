import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

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

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/paypal', paypalRouter);
app.use('/api/warriorplus', warriorplusRouter);
app.use('/api/meta', metaRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);

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
