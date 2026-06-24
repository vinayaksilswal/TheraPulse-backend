import express from 'express';
import prisma from '../db.js';

const router = express.Router();


// Get all orders (for admin)
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    
    // Map to legacy format for frontend compatibility
    const mapped = orders.map(o => ({
      id: o.orderNumber,
      timestamp: o.createdAt,
      customer: {
        fullName: o.customerName,
        email: o.customerEmail,
        address: o.shippingAddress,
        city: o.shippingCity,
        state: o.shippingState,
        zip: o.shippingZip,
        countryCode: o.shippingCountry,
        phone: o.shippingPhone
      },
      items: o.items.map(i => ({
        id: i.productId,
        name: i.name,
        qty: i.quantity,
        price: i.price,
        costPrice: i.costPrice
      })),
      total: o.totalAmount,
      cjOrderId: o.cjOrderId,
      status: o.status,
      audit: {
        revenue: o.auditRevenue,
        cost: o.auditCost,
        grossProfit: (o.auditRevenue || 0) - (o.auditCost || 0),
        margin: o.auditMargin
      }
    }));

    res.json({ success: true, list: mapped });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updated = await prisma.order.update({
      where: { orderNumber: id },
      data: { status }
    });
    
    res.json({ success: true, order: updated });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

export default router;
