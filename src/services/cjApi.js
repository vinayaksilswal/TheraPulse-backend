/**
 * CJ Dropshipping API Integration Service (Production-Hardened)
 * 
 * Provides connectivity with CJ Dropshipping Developer API (v2.0).
 * Handles token authentication, catalog fetching, and draft order creation.
 * 
 * Enterprise features:
 * - Retry with exponential backoff + circuit breaker via utils/retry.js
 * - Integer-cent pricing arithmetic via utils/pricing.js
 * - Structured logging via utils/logger.js
 * - Proactive token refresh
 * - Idempotent order creation
 * - Rate-limited bulk operations
 */

import { createLogger, getFormattedLogs } from '../utils/logger.js';
import { fetchWithRetry, RateLimiter } from '../utils/retry.js';
import {
  applyRetailMarkup,
  getStrikethroughPrice,
  toCents,
  toDollarNumber,
  verifyPriceIntegrity,
} from '../utils/pricing.js';
import { sanitizeProduct } from '../utils/validators.js';
import {
  generateProductCopy,
  containsHtml,
  stripHtml,
  generateLocalFallbackCopy,
  extractImagesFromHtml,
} from './geminiService';

// ─── Configuration ──────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_CJ_API_KEY || import.meta.env.CJ_drop || '';

const logger = createLogger('CJApi');

// Rate limiter: 1 request per second with burst capacity of 2
const cjRateLimiter = new RateLimiter(1, 2);

// ─── Token Management ───────────────────────────────────────────────

const TOKEN_KEY = 'cj_access_token';
const TOKEN_EXPIRY_KEY = 'cj_access_token_expiry';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

/**
 * Legacy log accessor for admin dashboard compatibility
 */
export const getLogs = () => getFormattedLogs();

/**
 * Legacy log writer — routes through structured logger
 */
export const addLog = (msg) => {
  logger.info(msg);
};

/**
 * Gets cached token or returns null if expired or missing
 * Proactively returns null if token expires within 5 minutes
 */
export const getCachedToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return null;

    const expiryDate = new Date(expiry);
    if (isNaN(expiryDate.getTime())) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }

    // Proactive refresh: return null if token expires within 5 minutes
    if (Date.now() > expiryDate.getTime() - TOKEN_REFRESH_BUFFER_MS) {
      logger.info('Access token nearing expiry — triggering proactive refresh');
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }

    return token;
  } catch {
    return null;
  }
};

/**
 * Authenticates with CJ Dropshipping using the API key
 * Uses retry engine for resilience
 */
export const getAccessToken = async (force = false) => {
  if (!force) {
    const cached = getCachedToken();
    if (cached) {
      logger.debug(`Using cached access token: ${cached.substring(0, 10)}...`);
      return { success: true, accessToken: cached, mode: 'Live' };
    }
  }

  if (!API_KEY) {
    logger.error('No CJ API key found. Cannot authenticate.', { envVar: 'VITE_CJ_API_KEY' });
    return { success: false, error: 'API Key missing from .env' };
  }

  logger.info(`Initiating token request for API key ending in ...${API_KEY.slice(-6)}`);

  try {
    const response = await fetchWithRetry(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY }),
      },
      { service: 'cj', operation: 'getAccessToken' }
    );

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.code === 200 && result.data?.accessToken) {
      const { accessToken, accessTokenExpiryDate } = result.data;
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, accessTokenExpiryDate);
      logger.info(`Successfully authenticated. Token cached. Expiry: ${accessTokenExpiryDate}`);
      return { success: true, accessToken, mode: 'Live', expiry: accessTokenExpiryDate };
    } else {
      throw new Error(result.message || 'Unknown authentication response');
    }
  } catch (err) {
    logger.error(`Authentication failed: "${err.message}"`, {
      code: err.code,
      hint: err.code === 'CIRCUIT_BREAKER_OPEN'
        ? 'CJ API circuit breaker is open. Service will auto-recover.'
        : 'Check API key or network connectivity.',
    });
    return { success: false, error: err.message };
  }
};

/**
 * Disconnects CJ API and removes cached tokens
 */
export const disconnectCJ = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  logger.info('Disconnected from CJ Dropshipping. Authorization cache purged.');
};

// ─── Storefront Product Database ────────────────────────────────────

const STOREFRONT_PRODUCTS_KEY = 'therapulse_storefront_products';
const IMPORTED_KEY = 'therapulse_imported_products';

const MOCK_PRODUCTS = [
  {
    pid: '1798542129166426112',
    productName: 'TheraPulse Clinical LED Mask',
    productSku: 'TP-CJ-CJPF2054402',
    sellPrice: 139.99,
    originalPrice: 199.99,
    costPrice: 45.00,
    productPriceMin: 139.99,
    productPriceMax: 139.99,
    inventory: 1240,
    categoryName: 'LED Devices',
    productImage: '/mask.png',
    description: 'Our signature medical-grade LED mask utilizes 633nm red light, 830nm near-infrared, and 415nm blue light spectrums for target cosmetic rejuvenation. Re-engineers cellular health and speeds up collagen production by up to 2.4x.',
  },
];

/**
 * Get all storefront products from local storage, initializing if empty
 * Includes self-healing migration for pricing and description integrity
 */
export const getStorefrontProducts = () => {
  try {
    const raw = localStorage.getItem(STOREFRONT_PRODUCTS_KEY);
    let currentProducts = [];
    let needsSave = false;

    if (raw) {
      currentProducts = JSON.parse(raw);

      // Enforce core products exist
      MOCK_PRODUCTS.forEach((mockP) => {
        if (!currentProducts.some((p) => p.pid === mockP.pid || p.pid === 'mask')) {
          currentProducts.push({ ...mockP });
          needsSave = true;
        }
      });
    } else {
      // Seed database with mock products
      currentProducts = MOCK_PRODUCTS.map((p) => ({
        ...p,
        productImages: [p.productImage],
        highlights: [
          'Clinically tested formula',
          'Visible results in 4-6 weeks',
          'Dermatologist recommended',
          'Free express shipping',
        ],
        tagline: 'Transform your skincare routine.',
      }));
      needsSave = true;
    }

    // Supplement with legacy imported products
    const legacyImported = getImportedProducts();
    legacyImported.forEach((p) => {
      if (!currentProducts.some((ip) => ip.pid === p.pid)) {
        const wholesaleCost = parseFloat(p.costPrice || p.cost || 12.0);
        currentProducts.push({
          pid: p.pid,
          productName: p.name,
          productSku: p.sku || p.productSku,
          sellPrice: p.price,
          originalPrice: p.originalPrice || getStrikethroughPrice(wholesaleCost),
          costPrice: wholesaleCost,
          productPriceMin: wholesaleCost,
          productPriceMax: wholesaleCost,
          inventory: p.inventory,
          categoryName: p.categoryName || (p.category === 'devices' ? 'LED Devices' : 'Serums & Patches'),
          productImage: p.image || p.productImage,
          productImages: [p.image || p.productImage],
          description: p.description,
          highlights: [
            'Clinically tested formula',
            'Visible results in 4-6 weeks',
            'Dermatologist recommended',
            'Free express shipping',
          ],
        });
        needsSave = true;
      }
    });

    // SELF-HEALING DATABASE MIGRATION
    currentProducts = currentProducts.map((p) => {
      let modified = false;
      const cost = parseFloat(p.costPrice || p.cost || 0);
      const sell = parseFloat(p.sellPrice || p.price || 0);

      // Merge old 'mask' ID to real CJ PID
      if (p.pid === 'mask') {
        p.pid = '1798542129166426112';
        p.productSku = 'TP-CJ-CJPF2054402';
        modified = true;
      }

      // Auto-fix pricing using cent-safe arithmetic
      if (cost > 0 && sell < cost + 15) {
        p.sellPrice = applyRetailMarkup(cost);
        p.price = p.sellPrice;
        p.originalPrice = getStrikethroughPrice(cost);
        modified = true;
      }

      // Auto-fix broken CJ descriptions
      if (
        p.description &&
        (containsHtml(p.description) ||
          p.description.includes('Overview') ||
          p.description.includes('Product information:'))
      ) {
        // Preserve images from raw HTML before overwriting
        if (containsHtml(p.description)) {
          const htmlImages = extractImagesFromHtml(p.description);
          if (htmlImages.length > 0) {
            p.productImages = [...new Set([...(p.productImages || []), ...htmlImages])];
          }
        }

        const fallback = generateLocalFallbackCopy(p.productName, p.description);
        p.productName = fallback.title;
        p.description = fallback.description;
        p.highlights = fallback.highlights;
        p.tagline = fallback.tagline;
        modified = true;
      }

      if (modified) needsSave = true;
      return p;
    });

    if (needsSave) {
      localStorage.setItem(STOREFRONT_PRODUCTS_KEY, JSON.stringify(currentProducts));
    }
    return currentProducts;
  } catch (e) {
    logger.error('Failed to parse storefront products', { error: e.message });
    return MOCK_PRODUCTS;
  }
};

/**
 * Save all storefront products to local storage
 */
export const saveStorefrontProducts = (products) => {
  localStorage.setItem(STOREFRONT_PRODUCTS_KEY, JSON.stringify(products));
};

/**
 * Update a storefront product
 */
export const updateStorefrontProduct = async (updatedProduct) => {
  const sanitized = sanitizeProduct(updatedProduct);
  
  try {
    const res = await fetch(`/api/products/${sanitized.pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized),
    });
    if (!res.ok) throw new Error('Failed to update product');
    logger.info(`Product "${sanitized.productName}" updated in storefront.`);
    return true;
  } catch (error) {
    logger.error('Failed to update product on server', { error: error.message });
    return false;
  }
};

/**
 * Run AI Copywriter bulk update on all storefront products
 * @param {function} onProgress - Progress callback (currentName, index, total)
 * @returns {Promise<{success: boolean, count: number}>}
 */
export const bulkAiRewriteProducts = async (onProgress) => {
  const res = await getCJProducts();
  if (!res.success) throw new Error('Could not fetch catalog for bulk rewrite');
  const products = res.list;
  const total = products.length;
  if (total === 0) return { success: true, count: 0 };

  for (let i = 0; i < total; i++) {
    const p = products[i];
    if (onProgress) {
      onProgress(p.productName, i + 1, total);
    }

    const cleanDesc = p.description
      ? containsHtml(p.description)
        ? stripHtml(p.description)
        : p.description
      : '';

    try {
      await cjRateLimiter.waitForToken();

      const aiCopy = await generateProductCopy(p.productName, cleanDesc, p.pid, true);
      if (aiCopy && !aiCopy.error) {
        const updated = {
          ...p,
          productName: aiCopy.title || p.productName,
          description: aiCopy.description || p.description,
          highlights:
            Array.isArray(aiCopy.highlights) && aiCopy.highlights.length > 0
              ? aiCopy.highlights.slice(0, 4)
              : p.highlights,
          tagline: aiCopy.tagline || p.tagline,
        };
        await updateStorefrontProduct(updated);
        logger.info(`Product "${p.productName}" AI copy optimized.`);
      } else {
        logger.warn(`Product "${p.productName}" copy generation skipped.`, {
          reason: aiCopy?.error || 'API response issue',
        });
      }
    } catch (e) {
      logger.error(`AI bulk copy failed for "${p.productName}"`, { error: e.message });
    }
  }

  return { success: true, count: total };
};

/**
 * Delete a product from the storefront catalog
 */
export const deleteStorefrontProduct = async (pid) => {
  try {
    const res = await fetch(`/api/products/${pid}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete product');
    logger.info(`Product ID "${pid}" removed from storefront.`);
    return true;
  } catch (error) {
    logger.error('Failed to delete product from server', { error: error.message });
    return false;
  }
};

/**
 * Reset storefront database to defaults
 */
export const resetStorefrontProducts = () => {
  localStorage.removeItem(STOREFRONT_PRODUCTS_KEY);
  localStorage.removeItem(IMPORTED_KEY);
  logger.info('Storefront products reset to default configuration.');
  return getStorefrontProducts();
};

export const getCJProducts = async (page = 1, size = 50) => {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('API server returned ' + res.status);
    const data = await res.json();
    if (data.success) {
      logger.info(`Loaded catalog from server: ${data.list.length} products total.`);
      return { success: true, list: data.list, mode: 'Live' };
    }
    throw new Error(data.error || 'Unknown API error');
  } catch (error) {
    logger.error('Failed to fetch from server', { error: error.message });
    return { success: false, error: error.message, list: [] };
  }
};

/**
 * Swap product order in storefront
 */
export const moveStorefrontProduct = async (pid, direction) => {
  const { list } = await getCJProducts();
  const index = list.findIndex((p) => p.pid === pid);
  if (index === -1) return false;
  if (pid === '1798542129166426112') return false;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return false;
  if (list[targetIndex].pid === '1798542129166426112') return false;

  const temp = list[index];
  list[index] = list[targetIndex];
  list[targetIndex] = temp;

  list.forEach((p, i) => {
    p.manualSortOrder = i;
  });

  try {
    const updates = list.map(p => 
      fetch(`/api/products/${p.pid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualSortOrder: p.manualSortOrder }),
      })
    );
    await Promise.all(updates);
  } catch (error) {
    logger.error('Failed to sync product order to server', { error: error.message });
  }

  return true;
};

// ─── Order Creation ─────────────────────────────────────────────────
// NOTE: Order creation has been securely moved to the backend (server/routes/paypal.js)
// to protect the CJ Dropshipping API keys from being exposed to the client.

// ─── Imported Products (Legacy) ─────────────────────────────────────

export const getImportedProducts = () => {
  try {
    const raw = localStorage.getItem(IMPORTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    logger.warn('Failed to parse imported products', { error: e.message });
    return [];
  }
};

/**
 * Import a product from CJ API into the storefront
 * BUG FIX: Previously referenced undefined `productName` variable on line 661.
 * Now correctly uses `product.productName`.
 */
export const addImportedProduct = async (product) => {
  const currentStorefront = getStorefrontProducts();

  // Get wholesale cost price for cent-safe markup calculation
  const wholesaleCost = parseFloat(product.sellPrice || product.productPriceMin || product.costPrice || 12.0);
  const retailPrice = applyRetailMarkup(wholesaleCost);
  const strikethroughPrice = getStrikethroughPrice(wholesaleCost);

  // Verify pricing integrity
  const priceCheck = verifyPriceIntegrity(retailPrice, wholesaleCost);
  if (!priceCheck.valid) {
    logger.warn(`Price integrity warning for "${product.productName}"`, {
      margin: priceCheck.margin,
      suggestedPrice: priceCheck.suggestedPrice,
    });
  }

  // Clean raw description
  const cleanDesc = product.description
    ? containsHtml(product.description)
      ? stripHtml(product.description)
      : product.description
    : '';

  // Run AI Copywriter during import
  let aiTitle = product.productName;
  let aiDesc = cleanDesc || 'Live dropshipped catalog item imported directly from your supply warehouse.';
  let aiHighlights = [
    'Clinically tested formula',
    'Visible results in 4-6 weeks',
    'Dermatologist recommended',
    'Free express shipping',
  ];
  let aiTagline = 'Transform your skincare routine.';

  try {
    // FIX: Was `productName` (undefined), now `product.productName`
    const aiCopy = await generateProductCopy(product.productName, cleanDesc, product.pid, true);
    if (aiCopy && aiCopy.title) {
      aiTitle = aiCopy.title;
      aiDesc = aiCopy.description;
      aiHighlights = aiCopy.highlights || aiHighlights;
      aiTagline = aiCopy.tagline || aiTagline;
    }
  } catch (e) {
    logger.warn('AI copy generation failed during import, using defaults', { error: e.message });
  }

  // Sanitize all string fields
  const formattedProduct = sanitizeProduct({
    pid: product.pid,
    productName: aiTitle,
    productSku: product.productSku || `TP-CJ-${product.pid}`,
    sellPrice: retailPrice,
    originalPrice: strikethroughPrice,
    costPrice: wholesaleCost,
    productPriceMin: wholesaleCost,
    productPriceMax: wholesaleCost,
    inventory: parseInt(product.inventory || 100, 10),
    listCount: parseInt(product.listCount || product.addCount || 0, 10),
    categoryName:
      product.categoryName ||
      (product.productSku?.toLowerCase().includes('device') ? 'LED Devices' : 'Serums & Patches'),
    productImage: product.productImage || '/mask.png',
    productImages: [product.productImage || '/mask.png'],
    description: aiDesc,
    highlights: aiHighlights,
    tagline: aiTagline,
  });

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedProduct),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save product to server');
    }
    logger.info(`Product "${formattedProduct.productName}" imported to storefront.`);
    return formattedProduct;
  } catch (error) {
    logger.error('Failed to save imported product to server', { error: error.message });
    throw error;
  }
};

// ─── Product Query ──────────────────────────────────────────────────

/**
 * Query CJ Dropshipping Product Details by PID
 * Includes SPU → PID resolution and AI copy generation
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

  let activeToken = getCachedToken();
  if (!activeToken) {
    const auth = await getAccessToken();
    if (!auth.success) return { success: false, error: 'Authentication failed' };
    activeToken = getCachedToken();
  }

  let resolvedPid = pid;

  // Resolve SPU codes to numeric PIDs
  if (typeof pid === 'string' && pid.toUpperCase().startsWith('CJ')) {
    logger.info(`Input "${pid}" detected as SPU. Resolving to numeric PID...`);
    try {
      await cjRateLimiter.waitForToken();
      const varRes = await fetchWithRetry(
        `https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?productSku=${pid}`,
        {
          method: 'GET',
          headers: { 'CJ-Access-Token': activeToken, 'Content-Type': 'application/json' },
        },
        { service: 'cj', operation: 'resolveSPU-variant' }
      );
      if (varRes.ok) {
        const varData = await varRes.json();
        if (varData.code === 200 && varData.data?.length > 0) {
          resolvedPid = varData.data[0].pid;
          logger.info(`SPU "${pid}" → PID "${resolvedPid}" via variant query.`);
        }
      }

      // Fallback: listV2 keyword search
      if (resolvedPid === pid) {
        await cjRateLimiter.waitForToken();
        const searchRes = await fetchWithRetry(
          `https://developers.cjdropshipping.com/api2.0/v1/product/listV2?page=1&size=5&keyWord=${pid}`,
          {
            method: 'GET',
            headers: { 'CJ-Access-Token': activeToken, 'Content-Type': 'application/json' },
          },
          { service: 'cj', operation: 'resolveSPU-search' }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.code === 200 && searchData.data?.content?.[0]) {
            const list = searchData.data.content[0].productList || [];
            if (list.length > 0) {
              resolvedPid = list[0].id || list[0].pid;
              logger.info(`SPU "${pid}" → PID "${resolvedPid}" via listV2 keyword search.`);
            }
          }
        }
      }

      if (resolvedPid === pid) {
        throw new Error(`Could not resolve SPU "${pid}" to a valid CJ product ID.`);
      }
    } catch (err) {
      logger.error(`SPU resolution failed for "${pid}"`, { error: err.message });
      return { success: false, error: err.message };
    }
  }

  logger.info(`Querying product details for PID: ${resolvedPid}`);

  try {
    await cjRateLimiter.waitForToken();
    const response = await fetchWithRetry(
      `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${resolvedPid}`,
      {
        method: 'GET',
        headers: { 'CJ-Access-Token': activeToken, 'Content-Type': 'application/json' },
      },
      { service: 'cj', operation: 'queryProduct' }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.code === 200 && result.data) {
      const data = result.data;
      const rawName =
        data.productNameEn ||
        data.nameEn ||
        (Array.isArray(data.productName) ? data.productName.join(' ') : data.productName) ||
        '';
      const productName = rawName.replace(/CJ Dropshipping|CJ/gi, 'TheraPulse').trim();

      logger.info(`Retrieved product "${productName}" from live CJ API.`);

      const cleanDesc = data.description
        ? containsHtml(data.description)
          ? stripHtml(data.description)
          : data.description
        : '';

      // Cent-safe markup calculation
      const wholesaleCost = parseFloat(data.sellPrice || data.productPriceMin || 12.0);
      const retailPrice = applyRetailMarkup(wholesaleCost);
      const strikethroughPrice = getStrikethroughPrice(wholesaleCost);

      // AI Copywriter
      let aiTitle = productName;
      let aiDesc = cleanDesc || 'Premium clinical technology designed for maximum skin restoration.';
      let aiHighlights = [
        'Clinically tested formula',
        'Visible results in 4-6 weeks',
        'Dermatologist recommended',
        'Free express shipping',
      ];
      let aiTagline = 'Transform your skincare routine.';

      try {
        const aiCopy = await generateProductCopy(productName, cleanDesc, resolvedPid, false);
        if (aiCopy && aiCopy.title) {
          aiTitle = aiCopy.title;
          aiDesc = aiCopy.description;
          aiHighlights = aiCopy.highlights || aiHighlights;
          aiTagline = aiCopy.tagline || aiTagline;
        }
      } catch (e) {
        logger.warn('AI copy generation failed during product query', { error: e.message });
      }

      const product = sanitizeProduct({
        ...data,
        pid: data.pid || resolvedPid,
        productName: aiTitle,
        description: aiDesc,
        highlights: aiHighlights,
        tagline: aiTagline,
        sellPrice: retailPrice,
        originalPrice: strikethroughPrice,
        costPrice: wholesaleCost,
        productPriceMin: wholesaleCost,
        productPriceMax: wholesaleCost,
        productImage:
          data.bigImage ||
          (Array.isArray(data.productImage) ? data.productImage[0] : data.productImage) ||
          '',
        productImages: data.productImageSet || [data.bigImage || '/mask.png'],
        productSku: data.productSku || data.sku || '',
      });

      // Auto-save to storefront
      if (storeRes.success && !storeRes.list.some((item) => item.pid === product.pid)) {
        try {
          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
          });
          logger.info(`Auto-imported "${product.productName}" to storefront database.`);
        } catch (e) {
          logger.error('Failed auto-import', { error: e.message });
        }
      }

      return { success: true, product, mode: 'Live' };
    } else {
      throw new Error(result.message || 'Product details not found');
    }
  } catch (err) {
    logger.warn(`Live query failed: "${err.message}". Searching local cache...`);

    const cached = localStorage.getItem('cj_product_cache');
    if (cached) {
      try {
        const list = JSON.parse(cached);
        const found = list.find((p) => p.pid === resolvedPid || p.productSku === resolvedPid);
        if (found) {
          return { success: true, product: found, mode: 'Cached' };
        }
      } catch {
        // Corrupted cache
      }
    }
    return { success: false, error: err.message };
  }
};

// ─── Variants ───────────────────────────────────────────────────────

/**
 * Get product variants with cent-safe pricing
 */
export const getProductVariants = async (pid) => {
  // Mock product: return standard variants
  if (pid === '1798542129166426112') {
    const baseVariants = [
      { vid: 'mask-standard', pid: '1798542129166426112', variantKey: 'Standard', variantNameEn: 'TheraPulse Clinical LED Mask (Standard)', sellPrice: 139.99 },
      { vid: 'mask-premium', pid: '1798542129166426112', variantKey: 'Premium Bundle', variantNameEn: 'TheraPulse Clinical LED Mask + Travel Case', sellPrice: 169.99 },
    ];

    // Try live CJ variants
    try {
      const token = getCachedToken();
      const activeToken = token || (await getAccessToken()).accessToken;
      if (activeToken) {
        await cjRateLimiter.waitForToken();
        const response = await fetchWithRetry(
          'https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?pid=1798542129166426112',
          {
            method: 'GET',
            headers: { 'CJ-Access-Token': activeToken, 'Content-Type': 'application/json' },
          },
          { service: 'cj', operation: 'getMaskVariants' }
        );
        if (response.ok) {
          const result = await response.json();
          if (result.code === 200 && result.data?.length > 0) {
            const cjVariants = result.data.map((v, index) => {
              const rawPrice = parseFloat(v.sellPrice || v.variantSellPrice || v.variantPrice);
              return {
                ...v,
                pid: '1798542129166426112',
                variantNameEn: `TheraPulse Clinical LED Mask - Set ${index + 1}`,
                sellPrice: isNaN(rawPrice) || rawPrice <= 0 ? 139.99 : applyRetailMarkup(rawPrice),
              };
            });
            return { success: true, variants: [...baseVariants, ...cjVariants] };
          }
        }
      }
    } catch (err) {
      logger.debug('Error fetching CJ mask variants, using fallbacks', { error: err.message });
    }

    // Fallback variants
    const fallbackCjVariants = [
      { vid: 'cj-variant-set1', pid: '1798542129166426112', variantKey: 'Set', variantNameEn: 'Clinical LED Mask — Complete Rejuvenation Set', sellPrice: 139.99 },
      { vid: 'cj-variant-set3', pid: '1798542129166426112', variantKey: 'Set3', variantNameEn: 'Clinical LED Mask — Advanced Therapy Set', sellPrice: 159.99 },
      { vid: 'cj-variant-set4', pid: '1798542129166426112', variantKey: 'Set4', variantNameEn: 'Clinical LED Mask — Premium Recovery Set', sellPrice: 179.99 },
      { vid: 'cj-variant-set5', pid: '1798542129166426112', variantKey: 'Set5', variantNameEn: 'Clinical LED Mask — Ultimate Clinical Set', sellPrice: 199.99 },
    ];
    return { success: true, variants: [...baseVariants, ...fallbackCjVariants] };
  }

  // Non-mock product: fetch from CJ
  let activeToken = getCachedToken();
  if (!activeToken) {
    const auth = await getAccessToken();
    if (!auth.success) return { success: false, error: 'Authentication failed' };
    activeToken = getCachedToken();
  }

  try {
    await cjRateLimiter.waitForToken();
    const response = await fetchWithRetry(
      `https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?pid=${pid}`,
      {
        method: 'GET',
        headers: { 'CJ-Access-Token': activeToken, 'Content-Type': 'application/json' },
      },
      { service: 'cj', operation: 'getVariants' }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (result.code === 200 && result.data) {
      const mapped = result.data.map((v) => {
        const rawPrice = parseFloat(v.sellPrice || v.variantSellPrice || v.variantPrice);
        return {
          ...v,
          sellPrice: isNaN(rawPrice) || rawPrice <= 0 ? 29.99 : applyRetailMarkup(rawPrice),
        };
      });
      return { success: true, variants: mapped };
    } else {
      throw new Error(result.message || 'Variants not found');
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ─── Auto-Sync ──────────────────────────────────────────────────────

let syncInterval = null;
export const startAutoSync = (intervalMs = 300000) => {
  if (syncInterval) clearInterval(syncInterval);

  syncInterval = setInterval(async () => {
    logger.info('Auto-syncing products with CJ Dropshipping...');
    const res = await getCJProducts(1, 100);
    if (res.success) {
      logger.info(`Auto-sync complete. Found ${res.list.length} products.`);
    }
  }, intervalMs);

  logger.info(`Auto-sync started. Interval: ${intervalMs}ms`);
  return () => clearInterval(syncInterval);
};

// Re-export pricing functions for backwards compatibility
export { applyRetailMarkup, getStrikethroughPrice };
