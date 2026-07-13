import { trackEvent, generateEventId } from './metaPixel';

export const FUNNEL_STEPS = {
  CART_OPENED: 'cart_drawer_opened',
  CHECKOUT_STARTED: 'checkout_started',
  SHIPPING_INFO_COMPLETED: 'shipping_info_completed',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  UPSELL_VIEWED: 'upsell_viewed',
  UPSELL_ACCEPTED: 'upsell_accepted',
  UPSELL_DECLINED: 'upsell_declined'
};

/**
 * Track a specific step in the purchase funnel.
 * @param {string} stepName - The funnel step name
 * @param {Object} data - Additional data like cart total
 */
export const trackFunnelStep = (stepName, data = {}) => {
  const eventId = generateEventId();
  // Using Meta Pixel Custom Events for full-funnel tracking.
  // This can be expanded to Amplitude or PostHog later.
  trackEvent(stepName, data, eventId);
};
