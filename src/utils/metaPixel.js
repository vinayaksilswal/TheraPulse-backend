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
