import express from 'express';
import prisma from '../db.js';
import { getAccessToken } from '../services/cjService.js';

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
          productImages: [
            '/mask.png',
            'https://oss-cf.cjdropshipping.com/product/2026/05/12/13/caecb048-6204-4b96-9549-1e59c3f8c669.jpg',
            'https://oss-cf.cjdropshipping.com/product/2026/06/15/01/e787c3e3-931d-4531-8ce7-5396e24d5bc7.jpg',
            'https://oss-cf.cjdropshipping.com/product/2025/04/14/08/985b7d9d-0f29-43bd-bdbd-c9027049e0ab_trans.jpeg',
            'https://oss-cf.cjdropshipping.com/product/2026/05/12/05/027c0f98-a624-4136-861d-edc0e29ff4a4.jpg',
            'https://oss-cf.cjdropshipping.com/product/2026/05/12/05/53a622c7-939e-469a-afbc-a5e065d87fb8.jpg',
            'https://oss-cf.cjdropshipping.com/product/2026/05/12/13/ca9c72d2-96df-4d90-8976-7615df342b08.jpg',
            'https://oss-cf.cjdropshipping.com/product/2025/04/14/08/56eb45a5-ec87-4856-8b42-6df0e3a47331_trans.jpeg'
          ],
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
    const productData = {
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
      productVideo: product.productVideo || null,
      description: product.description || '',
      highlights: product.highlights || [],
      tagline: product.tagline || '',
      listCount: product.listCount || 0,
      manualSortOrder: product.manualSortOrder,
    };

    const savedProduct = await prisma.product.upsert({
      where: { pid: product.pid },
      update: productData,
      create: productData,
    });
    
    res.json({ success: true, product: savedProduct });
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ success: false, error: 'Failed to save product' });
// Update an existing product
router.put('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const updates = req.body;
    
    // remove fields that should not be updated directly or don't exist in schema
    delete updates.id;
    delete updates.pid;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.productPriceMin;
    delete updates.productPriceMax;
    delete updates.price; // legacy field sometimes sent by frontend

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
