import { createLogger } from '../utils/logger.js';
const logger = createLogger('GeminiAI');

// ─── Main Generation Function ───────────────────────────────────────
export const generateProductCopy = async (productName, rawDescription, productId, bypassCache = false) => {
  const startTime = performance.now();

  try {
    const res = await fetch('/api/admin/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productName,
        description: rawDescription,
        productId,
        bypassCache
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const latencyMs = Math.round(performance.now() - startTime);

    if (data.success) {
      logger.info(`AI copy generated for "${productId}" in ${latencyMs}ms (Backend)`);
      return data;
    } else {
      throw new Error(data.error || 'Backend failed to generate copy');
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    logger.error('Gemini AI copy generation failed on backend', {
      error: err.message,
      latencyMs,
      productId,
    });
    
    // Return a dummy fallback in case backend fails entirely
    return {
      title: productName,
      description: rawDescription || 'Premium clinical technology.',
      highlights: ['Clinically tested', 'Premium quality', 'Dermatologist recommended', 'Fast shipping'],
      tagline: 'Transform your routine.',
      fromCache: false,
      error: err.message
    };
  }
};

// HTML utils that might be used elsewhere in frontend
export const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  try {
    const doc1 = new DOMParser().parseFromString(html, 'text/html');
    const decoded = doc1.body.textContent || html;
    const doc2 = new DOMParser().parseFromString(decoded, 'text/html');
    return doc2.body.textContent?.trim() || decoded.trim() || '';
  } catch {
    return html.replace(/<[^>]*>/g, '').trim();
  }
};

export const containsHtml = (text) => {
  if (!text || typeof text !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(text) || /&lt;[a-z][\s\S]*&gt;/i.test(text);
};

export const extractImagesFromHtml = (html) => {
  if (!html || typeof html !== 'string') return [];
  try {
    const doc1 = new DOMParser().parseFromString(html, 'text/html');
    const decoded = doc1.body.textContent || html;
    const doc = new DOMParser().parseFromString(decoded, 'text/html');
    const imgs = doc.querySelectorAll('img');
    const urls = [];
    imgs.forEach((img) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && src.startsWith('http')) {
        urls.push(src);
      }
    });
    return [...new Set(urls)];
  } catch {
    return [];
  }
};

export const generateLocalFallbackCopy = (productName, rawDescription) => ({
  title: productName,
  description: rawDescription || 'Premium clinical technology.',
  highlights: ['Clinically tested', 'Premium quality', 'Dermatologist recommended', 'Fast shipping'],
  tagline: 'Transform your routine.',
  fromCache: true,
  error: 'Using local fallback'
});

export const getCachedImages = (id) => {
  try {
    const cached = localStorage.getItem(`images_${id}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // ignore
  }
  return null;
};

export const setCachedImages = (id, images) => {
  try {
    localStorage.setItem(`images_${id}`, JSON.stringify(images));
  } catch (e) {
    // ignore
  }
};
