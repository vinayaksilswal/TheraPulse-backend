import express from 'express';
import prisma from '../db.js';

const router = express.Router();

const WARRIORPLUS_SECURITY_KEY = process.env.WARRIORPLUS_SECURITY_KEY;

router.post('/ipn', async (req, res) => {
  try {
    const data = req.body;

    // 1. Verify Security Key
    // If you haven't set a security key in .env, we skip verification for testing,
    // but in production, this should be strictly enforced.
    if (WARRIORPLUS_SECURITY_KEY && data.WP_SECURITYKEY !== WARRIORPLUS_SECURITY_KEY) {
      console.warn('WarriorPlus IPN: Invalid security key received.');
      return res.status(403).send('Forbidden: Invalid Security Key');
    }

    // Always respond 200 OK immediately to WarriorPlus so they don't retry unnecessarily
    res.status(200).send('OK');

    // 2. Only process sales
    if (data.WP_ACTION !== 'sale') {
      console.log(`WarriorPlus IPN: Received non-sale action: ${data.WP_ACTION}`);
      return;
    }

    const itemNumber = data.WP_ITEM_NUMBER;
    if (!itemNumber) {
      console.error('WarriorPlus IPN: Missing WP_ITEM_NUMBER');
      return;
    }

    // 3. Find the product in DB
    // We assume WP_ITEM_NUMBER maps to the product's pid or id.
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { pid: itemNumber },
          { id: itemNumber }
        ]
      }
    });

    if (!product) {
      console.error(`WarriorPlus IPN: Product ${itemNumber} not found in DB`);
      return;
    }

    // 4. Parse Customer Data
    // WarriorPlus primarily gives name and email. 
    // Physical shipping data must be passed via WP_CUSTOM (JSON string) from your frontend checkout,
    // or we fall back to defaults that will need manual update.
    let customData = {};
    if (data.WP_CUSTOM) {
      try {
        customData = JSON.parse(data.WP_CUSTOM);
      } catch (e) {
        console.warn('WarriorPlus IPN: Could not parse WP_CUSTOM as JSON');
      }
    }

    const customerData = {
      fullName: data.WP_BUYER_NAME || customData.fullName || 'Customer',
      email: data.WP_BUYER_EMAIL || customData.email || '',
      address: customData.address || 'Address Requires Manual Update',
      address2: customData.address2 || '',
      city: customData.city || 'TBD',
      state: customData.state || 'TBD',
      zip: customData.zip || '00000',
      countryCode: customData.countryCode || 'US',
      phone: customData.phone || ''
    };

    // 5. Financials
    const qty = parseInt(data.WP_SALE_QTY, 10) || 1;
    // WarriorPlus sends WP_SALE_AMOUNT which is the total sale.
    const revenue = parseFloat(data.WP_SALE_AMOUNT) || (product.sellPrice * qty);
    const cost = product.costPrice * qty;
    
    // 6. Call CJ Dropshipping API to create order
    const orderNumber = `WP-${data.WP_TXNID || Date.now()}`;
    let cjOrderId = 'N/A';
    
    try {
      const cjPayload = {
        orderNumber,
        shippingCustomerName: customerData.fullName,
        shippingAddress: customerData.address,
        shippingAddress2: customerData.address2,
        shippingCity: customerData.city,
        shippingProvince: customerData.state,
        shippingZip: customerData.zip,
        shippingCountryCode: customerData.countryCode,
        shippingCountry: customerData.countryCode === 'US' ? 'United States' : customerData.countryCode,
        shippingPhone: customerData.phone,
        remark: 'TheraPulse WarriorPlus Order',
        payType: '2',
        orderFlow: 1,
        products: [{
          vid: product.variants?.[0]?.vid || 'cj-variant-default', // Best effort if specific variant isn't passed
          quantity: qty,
          storeLineItemId: `item-wp-${Date.now()}`
        }]
      };
      
      const cjAuthResponse = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: process.env.CJ_API_KEY })
      });
      const cjAuth = await cjAuthResponse.json();
      
      if (cjAuth.code === 200 && cjAuth.data?.accessToken) {
        const cjResponse = await fetch('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV2', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CJ-Access-Token': cjAuth.data.accessToken
          },
          body: JSON.stringify(cjPayload)
        });
        const cjData = await cjResponse.json();
        if (cjData.code === 200 && cjData.data) {
          cjOrderId = cjData.data.orderId || orderNumber;
        } else {
            console.error('CJ Order creation error response:', cjData);
        }
      }
    } catch (err) {
      console.error('WarriorPlus IPN: CJ Order creation failed', err);
    }
    
    // 7. Save order to Neon DB
    const savedOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerName: customerData.fullName,
        shippingAddress: customerData.address,
        shippingCity: customerData.city,
        shippingState: customerData.state,
        shippingZip: customerData.zip,
        shippingCountry: customerData.countryCode,
        shippingPhone: customerData.phone,
        totalAmount: revenue,
        status: 'Processing',
        cjOrderId,
        paypalOrderId: data.WP_TXNID || `wp_${Date.now()}`, // Using WP txn ID here
        auditRevenue: revenue,
        auditCost: cost,
        auditMargin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
        items: {
          create: [{
            productId: product.id,
            name: product.productName,
            quantity: qty,
            price: revenue / qty,
            costPrice: product.costPrice,
            vid: 'wp-variant'
          }]
        }
      }
    });

    console.log(`WarriorPlus IPN: Successfully processed order ${orderNumber} for ${customerData.email}`);
  } catch (error) {
    console.error('WarriorPlus IPN Processing Error:', error);
    // Don't send 500 here because we already sent 200 OK at the top
  }
});

export default router;
