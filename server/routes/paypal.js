import express from 'express';
import prisma from '../db.js';
import { sendPurchaseEvent } from './meta.js';


const router = express.Router();


const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = 'https://api-m.paypal.com'; // Production. For sandbox, use api-m.sandbox.paypal.com

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to get PayPal token');
  return data.access_token;
}

router.post('/create-order', async (req, res) => {
  try {
    const { cart } = req.body;
    
    // Validate cart and calculate total on backend to prevent tampering
    let totalCents = 0;
    const dbItems = [];
    
    for (const item of cart) {
      const product = await prisma.product.findUnique({ where: { pid: item.pid || item.id }});
      if (!product) throw new Error(`Product ${item.pid || item.id} not found`);
      const qty = parseInt(item.qty, 10) || 1;
      totalCents += Math.round(product.sellPrice * 100) * qty;
      dbItems.push({ ...product, qty });
    }
    
    const totalValue = (totalCents / 100).toFixed(2);
    
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: totalValue
          }
        }]
      })
    });
    
    const orderData = await response.json();
    if (!response.ok) throw new Error(orderData.message || 'Failed to create PayPal order');
    
    res.json({ id: orderData.id, totalValue, items: dbItems });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/capture-order', async (req, res) => {
  try {
    const { orderID, customerData: frontendCustomerData, cart } = req.body;
    const accessToken = await getPayPalAccessToken();
    
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const captureData = await response.json();
    if (!response.ok) throw new Error(captureData.message || 'Failed to capture PayPal order');
    
    if (captureData.status === 'COMPLETED') {
      // Securely extract verified shipping data from PayPal
      const payer = captureData.payer || {};
      const shipping = captureData.purchase_units?.[0]?.shipping || {};
      const address = shipping.address || {};
      
      const customerData = {
        fullName: shipping.name?.full_name || frontendCustomerData?.fullName || `${payer.name?.given_name || ''} ${payer.name?.surname || ''}`.trim() || 'Customer',
        email: payer.email_address || frontendCustomerData?.email || '',
        address: address.address_line_1 || frontendCustomerData?.address || '',
        address2: address.address_line_2 || frontendCustomerData?.address2 || '',
        city: address.admin_area_2 || frontendCustomerData?.city || '',
        state: address.admin_area_1 || frontendCustomerData?.state || '',
        zip: address.postal_code || frontendCustomerData?.zip || '',
        countryCode: address.country_code || frontendCustomerData?.countryCode || 'US',
        phone: frontendCustomerData?.phone || ''
      };

      // Calculate financial data
      let totalCents = 0;
      let costCents = 0;
      
      const orderItemsData = [];
      for (const item of cart) {
        const product = await prisma.product.findUnique({ where: { pid: item.pid || item.id }});
        if (product) {
          const qty = parseInt(item.qty, 10) || 1;
          totalCents += Math.round(product.sellPrice * 100) * qty;
          costCents += Math.round(product.costPrice * 100) * qty;
          orderItemsData.push({
            productId: product.id,
            name: product.productName,
            quantity: qty,
            price: product.sellPrice,
            costPrice: product.costPrice,
            vid: item.vid || item.originalVid
          });
        }
      }
      
      const revenue = totalCents / 100;
      const cost = costCents / 100;
      
      // Call CJ Dropshipping API to create order
      const orderNumber = `TP-${Date.now()}`;
      let cjOrderId = 'N/A';
      try {
        const cjPayload = {
          orderNumber,
          shippingCustomerName: customerData.fullName || 'Customer',
          shippingAddress: customerData.address || '',
          shippingAddress2: '',
          shippingCity: customerData.city || '',
          shippingProvince: customerData.state || '',
          shippingZip: customerData.zip || '',
          shippingCountryCode: customerData.countryCode || 'US',
          shippingCountry: customerData.countryCode || 'United States',
          shippingPhone: customerData.phone || '',
          remark: 'TheraPulse Dropship Order',
          payType: '2',
          orderFlow: 1,
          products: orderItemsData.map((item, i) => ({
            vid: item.vid || 'cj-variant-set1', // Default or mapped
            quantity: item.quantity,
            storeLineItemId: `item-${i}-${Date.now()}`
          }))
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
          }
        }
      } catch (err) {
        console.error('CJ Order creation failed', err);
      }
      
      // Save order to Neon DB
      const savedOrder = await prisma.order.create({
        data: {
          orderNumber,
          customerName: customerData.fullName || 'Customer',
          shippingAddress: customerData.address || '',
          shippingCity: customerData.city || '',
          shippingState: customerData.state || '',
          shippingZip: customerData.zip || '',
          shippingCountry: customerData.countryCode || 'US',
          shippingPhone: customerData.phone || '',
          totalAmount: revenue,
          status: 'Processing',
          cjOrderId,
          paypalOrderId: orderID,
          auditRevenue: revenue,
          auditCost: cost,
          auditMargin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
          items: {
            create: orderItemsData
          }
        }
      });
      
      // Fire Meta CAPI Purchase Event
      const nameParts = (customerData.fullName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      await sendPurchaseEvent({
        orderId: orderNumber,
        amount: revenue,
        currency: 'USD',
        email: customerData.email,
        firstName,
        lastName,
        phone: customerData.phone,
        city: customerData.city,
        state: customerData.state,
        zip: customerData.zip,
        country: customerData.countryCode,
        items: cart,
        clientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        fbp: req.cookies?._fbp || frontendCustomerData?.fbp,
        fbc: req.cookies?._fbc || frontendCustomerData?.fbc,
        eventId: frontendCustomerData?.eventId // If passed from frontend for deduplication
      });
      
      res.json({ success: true, captureData, savedOrder });
    } else {
      res.json({ success: false, captureData });
    }
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
