import express from 'express';
import prisma from '../db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get orders for the logged-in user
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Find orders that match either the userId or the user's email
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: user.id },
          { customerEmail: user.email }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders.' });
  }
});

export default router;
