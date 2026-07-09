/**
 * CJ Dropshipping API Integration Service (Frontend)
 * 
 * Safe frontend methods to fetch products for display.
 * ALL admin functionalities (importing, rewriting, api keys) have been moved
 * to the Python Admin backend to enforce strict separation of concerns.
 */

import { createLogger } from '../utils/logger.js';
import { productOverrides } from '../data/productOverrides.js';

const logger = createLogger('CJApi');

const applyOverrides = (product) => {
  if (!product) return product;
  const override = productOverrides[product.pid || product.id];
  if (override) {
    return { ...product, ...override };
  }
  return product;
};

/**
 * Get all storefront products from the Vercel backend
 */
export const getCJProducts = async (page = 1, size = 50) => {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('API server returned ' + res.status);
    const data = await res.json();
    if (data.success) {
      logger.info(`Loaded catalog from server: ${data.list.length} products total.`);
      return { success: true, list: data.list.map(applyOverrides), mode: 'Live' };
    }
    throw new Error(data.error || 'Unknown API error');
  } catch (error) {
    logger.error('Failed to fetch from server', { error: error.message });
    return { success: false, error: error.message, list: [] };
  }
};

/**
 * Query a product from the database via Vercel backend
 */
export const queryCJProduct = async (pid) => {
  if (!pid) return { success: false, error: 'PID required' };

  // Return local storefront product if found
  const storeRes = await getCJProducts();
  if (storeRes.success) {
    const storeFound = storeRes.list.find((p) => p.pid === pid || p.productSku === pid);
    if (storeFound) {
      return { success: true, product: storeFound, mode: 'Database' };
    }
  }

  return { success: false, error: 'Product not found in storefront database' };
};

/**
 * Get product variants - fallback since admin backend handles this now
 */
export const getProductVariants = async (pid) => {
  return { success: false, error: 'Variant fetching is managed by admin backend.' };
};

// Re-export legacy functions that might be imported elsewhere, stubbed to prevent errors
export const getCachedToken = () => null;
export const getAccessToken = async () => ({ success: false, error: 'Token management moved to backend' });
export const disconnectCJ = () => {};
export const getLogs = () => [];
export const addLog = () => {};
