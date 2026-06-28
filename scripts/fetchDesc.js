import { getAccessToken } from '../server/services/cjService.js';

async function fetchDesc() {
  const token = (await getAccessToken()).accessToken;
  const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=2507290913441604900', {
    headers: { 'CJ-Access-Token': token }
  });
  const data = await res.json();
  import('fs').then(fs => fs.writeFileSync('scratch/desc.html', data.data.description));
  console.log("Wrote desc to scratch/desc.html");
}
fetchDesc();
