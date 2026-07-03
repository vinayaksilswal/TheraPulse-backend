/**
 * Lumively Input Validation & Sanitization Utilities
 * 
 * Enterprise-grade validators for checkout forms, product data,
 * and API payloads. Designed to prevent XSS, injection attacks,
 * and malformed data from reaching financial processing.
 */

/**
 * Strip all HTML tags from a string (XSS prevention)
 * @param {string} input - Raw input string
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')        // Strip HTML tags
    .replace(/&[a-z]+;/gi, '')      // Strip HTML entities
    .replace(/javascript:/gi, '')    // Strip JS protocol
    .replace(/on\w+=/gi, '')         // Strip event handlers
    .trim();
};

/**
 * Sanitize and truncate a string to a max length
 */
export const sanitizeAndTruncate = (input, maxLength = 500) => {
  const sanitized = sanitizeString(input);
  return sanitized.substring(0, maxLength);
};

// ─── Email Validation ─────────────────────────────────────────────

/**
 * Validate email address (RFC 5322 simplified subset)
 * @param {string} email 
 * @returns {{valid: boolean, error?: string}}
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length < 5 || trimmed.length > 254) {
    return { valid: false, error: 'Email address length is invalid' };
  }

  // RFC 5322 simplified regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
};

// ─── Phone Validation ─────────────────────────────────────────────

/**
 * Validate phone number
 * Accepts E.164 format, US formats (10-11 digits), and international
 * @param {string} phone 
 * @returns {{valid: boolean, error?: string, normalized?: string}}
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  // Strip all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Must have at least 10 digits
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 10) {
    return { valid: false, error: 'Phone number must have at least 10 digits' };
  }
  if (digits.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }

  // Don't allow all-zero phone numbers
  if (/^0+$/.test(digits)) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }

  return { valid: true, normalized: cleaned };
};

// ─── Name Validation ──────────────────────────────────────────────

/**
 * Validate full name
 * @param {string} name 
 * @returns {{valid: boolean, error?: string}}
 */
export const validateFullName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Full name is required' };
  }

  const trimmed = sanitizeString(name).trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long' };
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Name must contain letters' };
  }

  return { valid: true };
};

// ─── Address Validation ───────────────────────────────────────────

/**
 * Validate street address
 * @param {string} address 
 * @returns {{valid: boolean, error?: string}}
 */
export const validateAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Delivery address is required' };
  }

  const trimmed = sanitizeString(address).trim();

  if (trimmed.length < 5) {
    return { valid: false, error: 'Address must be at least 5 characters' };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: 'Address is too long' };
  }

  return { valid: true };
};

/**
 * Validate city
 * @param {string} city 
 * @returns {{valid: boolean, error?: string}}
 */
export const validateCity = (city) => {
  if (!city || typeof city !== 'string') {
    return { valid: false, error: 'City is required' };
  }

  const trimmed = sanitizeString(city).trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'City must be at least 2 characters' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'City name is too long' };
  }

  return { valid: true };
};

/**
 * Validate state/province
 * @param {string} state 
 * @returns {{valid: boolean, error?: string}}
 */
export const validateState = (state) => {
  if (!state || typeof state !== 'string') {
    return { valid: false, error: 'State is required' };
  }

  const trimmed = sanitizeString(state).trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'State must be at least 2 characters' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'State name is too long' };
  }

  return { valid: true };
};

/**
 * Validate ZIP/postal code
 * Supports US 5-digit, 5+4, and general international codes
 * @param {string} zip 
 * @returns {{valid: boolean, error?: string}}
 */
export const validateZip = (zip) => {
  if (!zip || typeof zip !== 'string') {
    return { valid: false, error: 'ZIP code is required' };
  }

  const trimmed = zip.trim();

  // US 5-digit or 5+4 format
  if (/^\d{5}(-\d{4})?$/.test(trimmed)) {
    return { valid: true };
  }

  // General international (alphanumeric, 3-10 chars)
  if (/^[a-zA-Z0-9\s-]{3,10}$/.test(trimmed)) {
    return { valid: true };
  }

  return { valid: false, error: 'Please enter a valid ZIP or postal code' };
};

// ─── Composite Validators ─────────────────────────────────────────

/**
 * Validate all shipping form fields at once
 * @param {Object} formData - { email, phone, fullName, address, city, state, zip }
 * @returns {{valid: boolean, errors: Object}}
 */
export const validateShippingForm = (formData) => {
  const errors = {};

  const emailResult = validateEmail(formData.email);
  if (!emailResult.valid) errors.email = emailResult.error;

  const phoneResult = validatePhone(formData.phone);
  if (!phoneResult.valid) errors.phone = phoneResult.error;

  const nameResult = validateFullName(formData.fullName);
  if (!nameResult.valid) errors.fullName = nameResult.error;

  const addressResult = validateAddress(formData.address);
  if (!addressResult.valid) errors.address = addressResult.error;

  const cityResult = validateCity(formData.city);
  if (!cityResult.valid) errors.city = cityResult.error;

  const stateResult = validateState(formData.state);
  if (!stateResult.valid) errors.state = stateResult.error;

  const zipResult = validateZip(formData.zip);
  if (!zipResult.valid) errors.zip = zipResult.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate PayPal order amount integrity
 * Ensures local cart total matches PayPal captured amount (anti-tampering)
 * 
 * @param {number} expectedTotal - Local cart total
 * @param {string|number} capturedAmount - Amount from PayPal capture response
 * @param {number} toleranceCents - Allowed tolerance in cents (default: 1 cent)
 * @returns {{valid: boolean, error?: string}}
 */
export const validatePayPalAmount = (expectedTotal, capturedAmount, toleranceCents = 1) => {
  const expected = Math.round(parseFloat(expectedTotal) * 100);
  const captured = Math.round(parseFloat(capturedAmount) * 100);

  if (!Number.isFinite(expected) || expected <= 0) {
    return { valid: false, error: 'Invalid expected total' };
  }
  if (!Number.isFinite(captured) || captured <= 0) {
    return { valid: false, error: 'Invalid captured amount from PayPal' };
  }

  const diff = Math.abs(expected - captured);
  if (diff > toleranceCents) {
    return {
      valid: false,
      error: `Amount mismatch: expected $${(expected / 100).toFixed(2)}, ` +
             `captured $${(captured / 100).toFixed(2)} (diff: ${diff} cents)`,
    };
  }

  return { valid: true };
};

/**
 * Sanitize all string fields in a product object (XSS prevention)
 * @param {Object} product - Raw product data
 * @returns {Object} Sanitized product
 */
export const sanitizeProduct = (product) => {
  if (!product || typeof product !== 'object') return product;

  const sanitized = { ...product };
  const stringFields = [
    'productName', 'description', 'categoryName', 'tagline',
    'productSku', 'productImage', 'productVideo',
  ];

  stringFields.forEach((field) => {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeAndTruncate(sanitized[field], field === 'description' ? 2000 : 500);
    }
  });

  if (Array.isArray(sanitized.highlights)) {
    sanitized.highlights = sanitized.highlights.map((h) =>
      typeof h === 'string' ? sanitizeAndTruncate(h, 150) : ''
    );
  }

  return sanitized;
};
