import { createLogger } from '../../src/utils/logger.js';
import { fetchWithRetry, RateLimiter } from '../../src/utils/retry.js';
import { applyRetailMarkup, getStrikethroughPrice } from '../../src/utils/pricing.js';
import { sanitizeProduct } from '../../src/utils/validators.js';
import { generateProductCopy, containsHtml, stripHtml, extractVideosFromHtml } from './geminiService.js';

const API_KEY = process.env.CJ_API_KEY || process.env.VITE_CJ_API_KEY || '';
const logger = createLogger('BackendCJApi');

const cjRateLimiter = new RateLimiter(1, 2);

// Token Cache in memory
let cachedToken = null;
let tokenExpiry = null;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const getCachedToken = () => {
  if (!cachedToken || !tokenExpiry) return null;
  const expiryDate = new Date(tokenExpiry);
  if (isNaN(expiryDate.getTime())) {
    cachedToken = null;
    tokenExpiry = null;
    return null;
  }
  if (Date.now() > expiryDate.getTime() - TOKEN_REFRESH_BUFFER_MS) {
    logger.info('Access token nearing expiry — triggering proactive refresh');
    cachedToken = null;
    tokenExpiry = null;
    return null;
  }
  return cachedToken;
};

export const getAccessToken = async (force = false) => {
  if (!force) {
    const cached = getCachedToken();
    if (cached) {
      return { success: true, accessToken: cached, mode: 'Live' };
    }
  }

  if (!API_KEY) {
    logger.error('No CJ API key found in backend .env.');
    return { success: false, error: 'API Key missing' };
  }

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
      cachedToken = accessToken;
      tokenExpiry = accessTokenExpiryDate;
      return { success: true, accessToken, mode: 'Live', expiry: accessTokenExpiryDate };
    } else {
      throw new Error(result.message || 'Unknown authentication response');
    }
  } catch (err) {
    logger.error(`Authentication failed: "${err.message}"`);
    return { success: false, error: err.message };
  }
};

export const queryCJProduct = async (pid) => {
  if (!pid) return { success: false, error: 'PID required' };

  let activeToken = getCachedToken();
  if (!activeToken) {
    const auth = await getAccessToken();
    if (!auth.success) return { success: false, error: 'Authentication failed' };
    activeToken = getCachedToken();
  }

  let resolvedPid = pid;

  if (typeof pid === 'string' && pid.toUpperCase().startsWith('CJ')) {
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
        }
      }

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
            }
          }
        }
      }
      if (resolvedPid === pid) {
        throw new Error(`Could not resolve SPU "${pid}"`);
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

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

      const cleanDesc = data.description
        ? containsHtml(data.description)
          ? stripHtml(data.description)
          : data.description
        : '';
        
      const htmlVideos = data.description ? extractVideosFromHtml(data.description) : [];
      const extractedVideo = htmlVideos.length > 0 ? htmlVideos[0] : '';

      const wholesaleCost = parseFloat(data.sellPrice || data.productPriceMin || 12.0);
      const retailPrice = applyRetailMarkup(wholesaleCost);
      const strikethroughPrice = getStrikethroughPrice(wholesaleCost);

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
        logger.warn('AI copy generation failed', { error: e.message });
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
        productVideo: data.productVideoUrl || data.video || data.videoUrl || data.productVideo || extractedVideo || '',
        productSku: data.productSku || data.sku || '',
      });

      return { success: true, product, mode: 'Live' };
    } else {
      throw new Error(result.message || 'Product details not found');
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getProductVariants = async (pid) => {
  if (pid === '1798542129166426112') {
    const baseVariants = [
      { vid: 'mask-standard', pid: '1798542129166426112', variantKey: 'Standard', variantNameEn: 'TheraPulse Clinical LED Mask (Standard)', sellPrice: 139.99 },
      { vid: 'mask-premium', pid: '1798542129166426112', variantKey: 'Premium Bundle', variantNameEn: 'TheraPulse Clinical LED Mask + Travel Case', sellPrice: 169.99 },
    ];
    return { success: true, variants: baseVariants };
  }

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
