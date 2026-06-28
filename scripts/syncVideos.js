import prisma from '../server/db.js';
import { queryCJProduct } from '../server/services/cjService.js';

async function syncVideos() {
  console.log('Starting product video sync for existing products...');
  try {
    const products = await prisma.product.findMany();
    console.log(`Found ${products.length} products to check.`);
    
    for (const product of products) {
      if (product.productVideo) {
        console.log(`[${product.pid}] Already has a video. Skipping.`);
        continue;
      }
      
      console.log(`[${product.pid}] Fetching data from CJ Dropshipping...`);
      const result = await queryCJProduct(product.pid);
      
      if (result.success && result.product && result.product.productVideo) {
        console.log(`[${product.pid}] Video found! Updating database...`);
        await prisma.product.update({
          where: { pid: product.pid },
          data: { productVideo: result.product.productVideo }
        });
        console.log(`[${product.pid}] Updated successfully.`);
      } else {
        console.log(`[${product.pid}] No video found or failed to fetch.`);
      }
      
      // Delay to avoid hitting rate limits too fast
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Video sync completed successfully.');
  } catch (error) {
    console.error('Error during video sync:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncVideos();
