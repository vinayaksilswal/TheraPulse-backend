import { createLogger } from '../../src/utils/logger.js';
import { fetchWithRetry, RateLimiter } from '../../src/utils/retry.js';
import { sanitizeAndTruncate } from '../../src/utils/validators.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_KEY || '';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const logger = createLogger('BackendGeminiAI');

// In-memory cache for backend
const copyCache = new Map();
const imageCache = new Map();

// Gemini Free Tier allows 15 RPM (1 request every 4 seconds)
// We set tokensPerSecond = 0.25 (1/4), bucketSize = 1
const geminiRateLimiter = new RateLimiter(0.25, 1);

// --- HTML Utilities ---
export const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

export const extractImagesFromHtml = (html) => {
  if (!html || typeof html !== 'string') return [];
  const urls = [];
  const regex = /<img[^>]+src=["'](http[^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return [...new Set(urls)];
};

export const containsHtml = (text) => {
  if (!text || typeof text !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(text) || /&lt;[a-z][\s\S]*&gt;/i.test(text);
};

// --- Cache Management ---
const getCachedCopy = (productId) => {
  const entry = copyCache.get(productId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    copyCache.delete(productId);
    return null;
  }
  return entry;
};

const setCachedCopy = (productId, copy) => {
  copyCache.set(productId, { ...copy, cachedAt: Date.now() });
};

// --- Content Safety ---
const sanitizeForPrompt = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[{}[\]]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/```/g, '')
    .substring(0, 1000);
};

const validateAiOutput = (parsed) => {
  const errors = [];
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Response is not a valid object'] };
  }
  if (typeof parsed.title !== 'string' || parsed.title.length < 3 || parsed.title.length > 100) {
    errors.push('Title must be 3-100 characters');
  }
  if (typeof parsed.description !== 'string' || parsed.description.length < 20) {
    errors.push('Description must be at least 20 characters');
  }
  if (!Array.isArray(parsed.highlights) || parsed.highlights.length < 1) {
    errors.push('Must have at least 1 highlight');
  }

  const unsafePatterns = [
    /\bcures?\b/i, /\btreat(?:s|ment)?\b/i, /\bguaranteed? results?\b/i,
    /\bFDA approved\b/i,
  ];
  const allText = `${parsed.title} ${parsed.description} ${(parsed.highlights || []).join(' ')}`;
  const flagged = unsafePatterns.filter((p) => p.test(allText));

  if (flagged.length > 0) {
    errors.push(`Contains potentially unsafe medical claims`);
  }

  return { valid: errors.length === 0, errors };
};

// --- Fallback ---
export const generateLocalFallbackCopy = (productName, rawDescription) => {
  let title = productName
    .replace(/Touch Screen/gi, '')
    .replace(/Seven-color/gi, 'Multi-Spectrum')
    .replace(/Photon/gi, '')
    .replace(/Skin Rejuvenation/gi, 'Skin Rejuvenation Mask')
    .replace(/LED/gi, 'LED')
    .replace(/CJ Dropshipping|CJ/gi, 'TheraPulse')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title.toLowerCase().includes('therapulse')) {
    title = `TheraPulse ${title}`;
  }

  title = title
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  const description = `Experience professional-grade wellness and care with the ${title}. Powered by advanced engineering and research-backed technology, this product is designed to seamlessly integrate into your daily routine. Achieve your goals with maximum efficacy and reliable results. Transform your lifestyle and discover the ultimate balance of quality and performance with our premium selection.`;

  const highlights = [
    'Clinically verified wavelength outputs',
    'Speeds up collagen synthesis',
    'Dermatologist approved technology',
    '60-day results guarantee included',
  ];

  const tagline = 'Professional dermatology, designed for everyday care.';

  return { title, description, highlights, tagline };
};

// --- Main Gen ---
export const generateProductCopy = async (productName, rawDescription, productId, bypassCache = false) => {
  const startTime = performance.now();

  if (!bypassCache) {
    const cached = getCachedCopy(productId);
    if (cached && cached.title) {
      return { ...cached, fromCache: true };
    }
  }

  const cleanDesc = containsHtml(rawDescription) ? stripHtml(rawDescription) : rawDescription;

  if (!GEMINI_KEY) {
    const fallback = generateLocalFallbackCopy(productName, cleanDesc);
    return { ...fallback, fromCache: false };
  }

  const safeName = sanitizeForPrompt(productName);
  const safeDesc = sanitizeForPrompt(cleanDesc);

  const prompt = `You are a world-class e-commerce copywriter and conversion rate optimization (CRO) expert for TheraPulse, a premium, clinical-grade health, wellness, and advanced skincare brand.

Your task is to write highly persuasive, high-converting, and premium copywriting for the product details below.
The brand voice is: authoritative, empathetic, science-backed, premium, and results-oriented.

Product Input:
- Original Title/Name: ${safeName}
- Raw Description: ${safeDesc || 'No description available'}

Please generate:
1. "title": A premium, refined, and catchy product title. Remove all spammy, generic dropship keywords, supplier codes, SPU IDs, or bulk packaging details. Keep it under 50 characters, clean, and highly appealing to retail shoppers (e.g., "Clinical Strength LED Mask" or "Superfood Mushroom Blend Coffee").
2. "description": An engaging, highly persuasive product story (max 3-4 sentences / 120 words). Focus on:
   - Captivating hook addressing a specific skincare/wellness pain point.
   - Clear value proposition: what makes this product unique and how it transforms the user's life.
   - Science-backed claims or clinical benefits (e.g., cell regeneration, deep hydration, natural energy).
   - Clear call to benefit (why they need it in their daily routine now).
   - The tone must be conversational, sophisticated, and premium.
3. "highlights": Exactly 4 concise, high-impact bullet points (max 10 words each). Each bullet point MUST focus on a distinct, tangible benefit (e.g., "Reduces wrinkles in just 4 weeks", "Provides smooth, jitter-free energy focus", "Dermatologist tested & approved").
4. "tagline": A memorable, punchy brand tagline of 4-8 words (e.g., "Professional results, from the comfort of home" or "Fuel your focus, naturally").

You MUST return your output in the exact JSON format below. Do not wrap it in markdown code blocks or add any other text outside the JSON:
{"title": "...", "description": "...", "highlights": ["...", "...", "...", "..."], "tagline": "..."}`;

  try {
    // Await token from rate limiter to ensure we don't exceed 15 RPM
    await geminiRateLimiter.waitForToken();

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
          },
        }),
      },
      { service: 'gemini', operation: 'generateCopy' }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned HTTP ${response.status}`);
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    let cleanJson = text.trim();
    const jsonStart = cleanJson.indexOf('{');
    const jsonEnd = cleanJson.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleanJson);
    const validation = validateAiOutput(parsed);
    if (!validation.valid) {
      const fallback = generateLocalFallbackCopy(productName, cleanDesc);
      setCachedCopy(productId, fallback);
      return { ...fallback, fromCache: false, validationErrors: validation.errors };
    }

    const aiCopy = {
      title: sanitizeAndTruncate(parsed.title || productName, 100),
      description: sanitizeAndTruncate(parsed.description || cleanDesc, 2000),
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.slice(0, 4).map((h) => sanitizeAndTruncate(h, 150))
        : [],
      tagline: sanitizeAndTruncate(parsed.tagline || '', 100),
    };

    setCachedCopy(productId, aiCopy);
    return { ...aiCopy, fromCache: false };
  } catch (err) {
    const fallback = generateLocalFallbackCopy(productName, cleanDesc);
    return { ...fallback, fromCache: false, error: err.message };
  }
};
