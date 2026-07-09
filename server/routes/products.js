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
          productName: 'Lumively Clinical LED Mask',
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

// Generate Meta Commerce Manager CSV Data Feed
router.get('/catalog.csv', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    
    // Required Facebook Catalog Headers
    const headers = [
      'id', 'title', 'description', 'availability', 'condition', 
      'price', 'link', 'image_link', 'brand'
    ];
    
    let csv = headers.join(',') + '\n';
    
    const escapeCsv = (str) => {
      if (!str) return '""';
      return `"${str.toString().replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };

    products.forEach(p => {
      const row = [
        escapeCsv(p.pid),
        escapeCsv(p.productName),
        escapeCsv(p.description ? p.description.substring(0, 5000) : p.productName),
        'in stock',
        'new',
        `${parseFloat(p.sellPrice || 0).toFixed(2)} USD`,
        escapeCsv(`https://www.lumively.com/product/${p.pid}`),
        escapeCsv(p.productImage || 'https://www.lumively.com/mask.png'),
        'Lumively'
      ];
      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="facebook_catalog.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error generating catalog CSV:', error);
    res.status(500).send('Error generating catalog feed');
  }
});

// Product management (POST, PUT, DELETE) has been moved to the Python Admin backend
// to enforce strict separation of concerns between frontend and backend.

export default router;
