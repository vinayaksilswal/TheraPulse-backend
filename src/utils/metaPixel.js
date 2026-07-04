/**
 * Meta Pixel & Conversions API (CAPI) Tracking Utility
 * Standardizes event tracking across the frontend and ensures deduplication via eventId.
 */

// Generate a unique ID for CAPI deduplication
export const generateEventId = () => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Fires a standard Meta Pixel event
 * @param {string} eventName - Standard event name (e.g., ViewContent, AddToCart, InitiateCheckout)
 * @param {Object} data - Event parameters (value, currency, content_ids, etc.)
 * @param {string} eventId - Unique ID for deduplication with Server-Side CAPI
 */
export const trackEvent = (eventName, data = {}, eventId = null) => {
  try {
    const payload = { ...data };
    const options = {};
    
    if (eventId) {
      options.eventID = eventId;
    }

    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, payload, options);
      console.log(`[Meta Pixel] Tracked ${eventName}`, { payload, options });
    } else {
      console.warn(`[Meta Pixel] fbq not found. Event ${eventName} dropped.`);
    }
  } catch (error) {
    console.error(`[Meta Pixel] Failed to track ${eventName}:`, error);
  }
};

/**
 * Extracts a cookie value by name
 */
const getCookie = (name) => {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return undefined;
};

/**
 * Extracts fbclid from URL to immediately construct fbc on first page load
 * before the Meta script writes the cookie
 */
const getFbcFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const fbclid = urlObj.searchParams.get('fbclid');
    if (fbclid) {
      return `fb.1.${Date.now()}.${fbclid}`;
    }
  } catch (e) {
    // Ignore invalid URL parsing
  }
  return undefined;
};

/**
 * Fires a PageView event on both Client and Server (CAPI) with deduplication
 */
export const trackPageView = async (url) => {
  const eventId = generateEventId();
  
  // Track on client (Meta Pixel)
  trackEvent('PageView', {}, eventId);

  // Track on server (CAPI)
  try {
    const fbp = getCookie('_fbp');
    // Prioritize URL fbclid if present (landing page), fallback to cookie
    const fbc = getFbcFromUrl(url) || getCookie('_fbc');
    
    // In development, might need full URL if backend is on a different port,
    // but assuming standard proxy or relative path works in prod.
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    
    await fetch(`${apiUrl}/meta/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        url,
        fbp,
        fbc
      })
    });
  } catch (error) {
    console.error('[Meta CAPI] Failed to send PageView to server:', error);
  }
};
