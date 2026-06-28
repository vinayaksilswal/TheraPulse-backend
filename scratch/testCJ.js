import dotenv from 'dotenv';
dotenv.config();
import { queryCJProduct } from './server/services/cjService.js';
import { getAccessToken } from './server/services/cjApi.js'; // Wait, getAccessToken is in cjService.js? No, let's see

async function test() {
  const result = await queryCJProduct('2507290913441604900');
  console.log(JSON.stringify(result, null, 2));
}
test();
