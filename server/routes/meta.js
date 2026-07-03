import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Fallback values for development or if env vars are missing
const META_PIXEL_ID = process.env.META_PIXEL_ID || '1011293448319451'; // From CSV
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 

/**
 * Normalizes and hashes user data according to Meta's CAPI requirements
 * @param {string} value The raw string to hash
 * @returns {string} SHA-256 hash of the normalized string
 */
const hashData = (value) => {
  if (!value) return undefined;
  const normalized = value.toString().toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Sends a Purchase event to Meta Conversions API
 * @param {Object} data Order details
 */
export const sendPurchaseEvent = async (data) => {
  if (!META_ACCESS_TOKEN) {
    console.warn('[Meta CAPI] Skipping server-side event: META_ACCESS_TOKEN is not configured.');
    return;
  }

  const { orderId, amount, currency, email, firstName, lastName, phone, city, state, zip, country, items, clientIp, userAgent, fbp, fbc, eventId } = data;

  const eventPayload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_id: eventId || `order_${orderId}`,
        event_source_url: 'https://lumively.com/checkout',
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: userAgent,
          fbp: fbp,
          fbc: fbc,
          em: [hashData(email)],
          fn: [hashData(firstName)],
          ln: [hashData(lastName)],
          ph: [hashData(phone)],
          ct: [hashData(city)],
          st: [hashData(state)],
          zp: [hashData(zip)],
          country: [hashData(country)]
        },
        custom_data: {
          currency: currency || 'USD',
          value: parseFloat(amount),
          order_id: orderId,
          contents: items?.map(item => ({
            id: item.id || item.pid,
            quantity: item.qty,
            item_price: parseFloat(item.price)
          })) || []
        }
      }
    ]
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[Meta CAPI] Error sending event:', result);
    } else {
      console.log(`[Meta CAPI] Successfully sent Purchase event for Order ${orderId}`);
    }
  } catch (error) {
    console.error('[Meta CAPI] Request failed:', error);
  }
};

export default router;
