import prisma from '../server/db.js';
import { extractVideosFromHtml } from '../server/services/geminiService.js';
import { getAccessToken } from '../server/services/cjService.js';

async function syncVideosFast() {
  console.log('Starting fast video sync...');
  
  try {
    const authData = await getAccessToken();
    const token = authData.accessToken;
    
    if (!token) {
      console.error('Failed to get token:', authData);
      return;
    }
    
    const products = await prisma.product.findMany();
    console.log(`Found ${products.length} products to check.`);

    for (const product of products) {
      if (product.productVideo && product.productVideo !== '') {
        console.log(`[${product.pid}] Already has video. Skipping.`);
        continue;
      }
      
      console.log(`[${product.pid}] Fetching raw data from CJ...`);
      // Add manual delay to avoid 429
      await new Promise(r => setTimeout(r, 2000));
      
      try {
        const response = await fetch(
          `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${product.pid}`,
          {
            method: 'GET',
            headers: { 'CJ-Access-Token': token, 'Content-Type': 'application/json' }
          }
        );
        
        if (!response.ok) {
           console.log(`[${product.pid}] Error: HTTP ${response.status}`);
           continue;
        }
        
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
          let video = result.data.productVideoUrl || result.data.video || result.data.videoUrl || result.data.productVideo || '';
          
          if (!video && result.data.description) {
             const extracted = extractVideosFromHtml(result.data.description);
             if (extracted.length > 0) {
               video = extracted[0];
               console.log(`[${product.pid}] Extracted video from HTML: ${video}`);
             }
          }
          
          if (video) {
             console.log(`[${product.pid}] Found video! Updating DB...`);
             await prisma.product.update({
               where: { pid: product.pid },
               data: { productVideo: video }
             });
          } else {
             console.log(`[${product.pid}] No video found.`);
          }
        } else {
          console.log(`[${product.pid}] CJ API Error: ${result.message}`);
        }
      } catch (err) {
        console.log(`[${product.pid}] Error: ${err.message}`);
      }
    }
    console.log('Sync complete!');
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}
syncVideosFast();
