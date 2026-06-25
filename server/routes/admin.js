import express from 'express';
import { generateProductCopy } from '../services/geminiService.js';
import { queryCJProduct, getAccessToken, getProductVariants } from '../services/cjService.js';
import { createLogger } from '../../src/utils/logger.js';

const router = express.Router();
const logger = createLogger('AdminRouter');

// GET /api/admin/cj/auth - Check CJ auth status
router.get('/cj/auth', async (req, res) => {
  const result = await getAccessToken();
  if (result.success) {
    res.json({ success: true, mode: result.mode });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// GET /api/admin/cj/variants/:pid
router.get('/cj/variants/:pid', async (req, res) => {
  const { pid } = req.params;
  const result = await getProductVariants(pid);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// GET /api/admin/cj/product/:pid
router.get('/cj/product/:pid', async (req, res) => {
  const { pid } = req.params;
  const result = await queryCJProduct(pid);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// POST /api/admin/gemini/generate
router.post('/gemini/generate', async (req, res) => {
  const { productName, description, productId, bypassCache } = req.body;
  if (!productName || !productId) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const result = await generateProductCopy(productName, description, productId, bypassCache);
    res.json({ success: !result.error, ...result });
  } catch (error) {
    logger.error('Gemini generate route error', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
