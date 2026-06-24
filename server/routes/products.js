import express from 'express';
import prisma from '../db.js';

const router = express.Router();


// Get all storefront products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [
        { manualSortOrder: 'asc' },
        { listCount: 'desc' }
      ]
    });
    
    // Add default products if DB is empty
    if (products.length === 0) {
      // Seed with mock product
      const seeded = await prisma.product.create({
        data: {
          pid: '1798542129166426112',
          productName: 'TheraPulse Clinical LED Mask',
          productSku: 'TP-CJ-CJPF2054402',
          sellPrice: 139.99,
          originalPrice: 199.99,
          costPrice: 45.00,
          inventory: 1240,
          categoryName: 'LED Devices',
          productImage: '/mask.png',
          productImages: ['/mask.png'],
          description: 'Our signature medical-grade LED mask utilizes 633nm red light, 830nm near-infrared, and 415nm blue light spectrums for target cosmetic rejuvenation. Re-engineers cellular health and speeds up collagen production by up to 2.4x.',
          highlights: [
            'Clinically tested formula',
            'Visible results in 4-6 weeks',
            'Dermatologist recommended',
            'Free express shipping'
          ],
          tagline: 'Transform your skincare routine.'
        }
      });
      return res.json({ success: true, list: [seeded] });
    }

    res.json({ success: true, list: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

export default router;
