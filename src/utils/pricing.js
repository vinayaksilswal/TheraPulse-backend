/**
 * TheraPulse Integer-Cent Pricing Engine
 * 
 * All internal calculations use integer cents to eliminate
 * IEEE 754 floating-point rounding errors in financial arithmetic.
 * Display values are converted to dollars only at the presentation layer.
 * 
 * Pipeline: cost → +buffer → ×markup → round → display
 */

// Configuration constants (in cents)
const SHIPPING_BUFFER_CENTS = 1500; // $15.00 average CJ shipping cost
const RETAIL_MULTIPLIER = 2.0;      // 2X margin for ad campaigns
const STRIKETHROUGH_MULTIPLIER = 3.0; // 3X for psychological anchoring
const DEFAULT_RETAIL_CENTS = 2999;   // $29.99 fallback
const DEFAULT_STRIKE_CENTS = 4999;   // $49.99 fallback

/**
 * Convert a dollar amount (string or number) to integer cents
 * Handles floating-point edge cases by rounding after multiplication
 * 
 * @param {number|string} dollars - Dollar amount (e.g., 12.50 or "12.50")
 * @returns {number} Integer cents (e.g., 1250)
 */
export const toCents = (dollars) => {
  const parsed = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
};

/**
 * Convert integer cents back to a dollar string
 * 
 * @param {number} cents - Integer cents (e.g., 1250)
 * @returns {string} Dollar string (e.g., "12.50")
 */
export const toDollars = (cents) => {
  if (!Number.isFinite(cents)) return '0.00';
  return (cents / 100).toFixed(2);
};

/**
 * Convert integer cents to a dollar number (for calculations that need float)
 * 
 * @param {number} cents - Integer cents
 * @returns {number} Dollar number (e.g., 12.50)
 */
export const toDollarNumber = (cents) => {
  if (!Number.isFinite(cents)) return 0;
  return parseFloat((cents / 100).toFixed(2));
};

/**
 * Safe multiplication of cents by a multiplier
 * Returns rounded integer cents
 * 
 * @param {number} cents - Integer cents
 * @param {number} multiplier - Multiplication factor
 * @returns {number} Integer cents result
 */
export const safeMultiply = (cents, multiplier) => {
  if (!Number.isFinite(cents) || !Number.isFinite(multiplier)) return 0;
  return Math.round(cents * multiplier);
};

/**
 * Safe addition of two cent amounts
 * 
 * @param {number} centsA - First amount in cents
 * @param {number} centsB - Second amount in cents
 * @returns {number} Sum in integer cents
 */
export const safeAdd = (centsA, centsB) => {
  return (centsA || 0) + (centsB || 0);
};

/**
 * Apply the TheraPulse retail markup pipeline
 * Pipeline: wholesaleCost → + $15 shipping buffer → × 2.0 retail multiplier
 * 
 * @param {number|string} wholesalePriceDollars - CJ wholesale cost in dollars
 * @returns {number} Retail price in dollars (e.g., 120.00)
 */
export const applyRetailMarkup = (wholesalePriceDollars) => {
  const costCents = toCents(wholesalePriceDollars);
  if (costCents <= 0) return toDollarNumber(DEFAULT_RETAIL_CENTS);

  const bufferedCents = safeAdd(costCents, SHIPPING_BUFFER_CENTS);
  const retailCents = safeMultiply(bufferedCents, RETAIL_MULTIPLIER);

  return toDollarNumber(retailCents);
};

/**
 * Calculate the strikethrough (was) price
 * Pipeline: wholesaleCost → + $15 shipping buffer → × 3.0 strikethrough multiplier
 * 
 * @param {number|string} wholesalePriceDollars - CJ wholesale cost in dollars
 * @returns {number} Strikethrough price in dollars (e.g., 180.00)
 */
export const getStrikethroughPrice = (wholesalePriceDollars) => {
  const costCents = toCents(wholesalePriceDollars);
  if (costCents <= 0) return toDollarNumber(DEFAULT_STRIKE_CENTS);

  const bufferedCents = safeAdd(costCents, SHIPPING_BUFFER_CENTS);
  const strikeCents = safeMultiply(bufferedCents, STRIKETHROUGH_MULTIPLIER);

  return toDollarNumber(strikeCents);
};

/**
 * Calculate gross profit margin percentage
 * 
 * @param {number} retailDollars - Retail selling price
 * @param {number} costDollars - Wholesale cost
 * @returns {number} Margin percentage (e.g., 65.5)
 */
export const calculateMarginPercent = (retailDollars, costDollars) => {
  const retailCents = toCents(retailDollars);
  const costCents = toCents(costDollars);
  if (retailCents <= 0) return 0;
  return parseFloat((((retailCents - costCents) / retailCents) * 100).toFixed(1));
};

/**
 * Calculate the save percentage between original and sale price
 * 
 * @param {number} originalDollars - Original/strikethrough price
 * @param {number} saleDollars - Current sale price
 * @returns {number} Save percentage as integer (e.g., 33)
 */
export const calculateSavePercent = (originalDollars, saleDollars) => {
  const originalCents = toCents(originalDollars);
  const saleCents = toCents(saleDollars);
  if (originalCents <= 0 || saleCents <= 0) return 0;
  if (saleCents >= originalCents) return 0;
  return Math.round(((originalCents - saleCents) / originalCents) * 100);
};

/**
 * Validate that a price is a positive finite number with at most 2 decimal places
 * 
 * @param {*} price - Value to validate
 * @returns {boolean} Whether the price is valid
 */
export const isValidPrice = (price) => {
  const parsed = typeof price === 'string' ? parseFloat(price) : price;
  if (!Number.isFinite(parsed) || parsed < 0) return false;
  // Check for at most 2 decimal places
  return Math.round(parsed * 100) === parsed * 100;
};

/**
 * Format a dollar amount for display
 * 
 * @param {number|string} dollars - Dollar amount
 * @returns {string} Formatted string (e.g., "$120.00")
 */
export const formatPrice = (dollars) => {
  const parsed = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  if (!Number.isFinite(parsed)) return '$0.00';
  return `$${toDollarNumber(toCents(parsed)).toFixed(2)}`;
};

/**
 * Sum an array of cart items (price × quantity) with cent-safe arithmetic
 * 
 * @param {Array<{price: number, qty: number}>} items - Cart items
 * @returns {number} Total in dollars
 */
export const calculateCartTotal = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 0;

  const totalCents = items.reduce((sum, item) => {
    const priceCents = toCents(item.price || 0);
    const quantity = Math.max(0, parseInt(item.qty, 10) || 0);
    return sum + (priceCents * quantity);
  }, 0);

  return toDollarNumber(totalCents);
};

/**
 * Verify that a retail price maintains minimum margin above cost
 * Used during import to catch pricing errors
 * 
 * @param {number} retailDollars - Proposed retail price
 * @param {number} costDollars - Wholesale cost
 * @param {number} minMarginPercent - Minimum acceptable margin (default 30%)
 * @returns {{valid: boolean, margin: number, suggestedPrice: number}}
 */
export const verifyPriceIntegrity = (retailDollars, costDollars, minMarginPercent = 30) => {
  const margin = calculateMarginPercent(retailDollars, costDollars);
  const valid = margin >= minMarginPercent;
  const suggestedPrice = valid ? retailDollars : applyRetailMarkup(costDollars);

  return { valid, margin, suggestedPrice };
};

export {
  SHIPPING_BUFFER_CENTS,
  RETAIL_MULTIPLIER,
  STRIKETHROUGH_MULTIPLIER,
};
