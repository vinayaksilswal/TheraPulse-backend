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

// Add a new product
router.post('/', async (req, res) => {
  try {
    const product = req.body;
    const existing = await prisma.product.findUnique({ where: { pid: product.pid } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Product already exists' });
    }
    const created = await prisma.product.create({
      data: {
        pid: product.pid,
        productName: product.productName || '',
        productSku: product.productSku || '',
        sellPrice: product.sellPrice || 0,
        originalPrice: product.originalPrice || 0,
        costPrice: product.costPrice || 0,
        inventory: product.inventory || 0,
        categoryName: product.categoryName || '',
        productImage: product.productImage || '',
        productImages: product.productImages || [],
        description: product.description || '',
        highlights: product.highlights || [],
        tagline: product.tagline || '',
        listCount: product.listCount || 0,
        manualSortOrder: product.manualSortOrder,
      }
    });
    res.json({ success: true, product: created });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ success: false, error: 'Failed to add product' });
  }
});

// Update an existing product
router.put('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const updates = req.body;
    
    // remove fields that should not be updated directly
    delete updates.id;
    delete updates.pid;
    delete updates.createdAt;
    delete updates.updatedAt;

    const updated = await prisma.product.update({
      where: { pid },
      data: updates
    });
    res.json({ success: true, product: updated });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// Delete a product
router.delete('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    await prisma.product.delete({
      where: { pid }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

export default router;
