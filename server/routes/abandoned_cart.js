import express from 'express';
import prisma from '../db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { email, cart, includeWarranty } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cartData = { items: cart, includeWarranty };

    await prisma.abandonedCart.upsert({
      where: { email },
      update: { cartData, updatedAt: new Date(), recovered: false },
      create: { email, cartData }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking abandoned cart:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
