import { getAccessToken } from '../server/services/cjService.js';
import fs from 'fs';

async function fetchRaw() {
  const token = (await getAccessToken()).accessToken;
  const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=2507290913441604900', {
    headers: { 'CJ-Access-Token': token }
  });
  const data = await res.json();
  fs.writeFileSync('scratch/cj_data.json', JSON.stringify(data, null, 2));
}
fetchRaw();
