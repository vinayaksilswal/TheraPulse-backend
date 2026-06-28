import prisma from '../server/db.js';
import { getAccessToken } from '../server/services/cjService.js';

async function fixImages() {
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products to check...`);

  const authData = await getAccessToken();
  const token = authData.accessToken;
  if (!token) {
    console.error('Failed to get CJ access token.');
    return;
  }

  for (const product of products) {
    // Only update if it has 1 or fewer images
    if (product.productImages && product.productImages.length > 1) {
      console.log(`Product ${product.pid} already has ${product.productImages.length} images. Skipping.`);
      continue;
    }
    
    console.log(`Fetching full images for ${product.pid}...`);
    try {
      const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${product.pid}`, {
        headers: { 'CJ-Access-Token': token }
      });
      const data = await res.json();
      
      if (data.code === 200 && data.data && data.data.productImageSet && data.data.productImageSet.length > 0) {
        await prisma.product.update({
          where: { pid: product.pid },
          data: { productImages: data.data.productImageSet }
        });
        console.log(`Updated ${product.pid} with ${data.data.productImageSet.length} images.`);
      } else {
        console.log(`No additional images found for ${product.pid}. Data:`, JSON.stringify(data));
      }
    } catch (e) {
      console.error(`Error updating ${product.pid}: ${e.message}`);
    }
  }
  console.log('Finished updating images.');
}

fixImages();
