import dotenv from 'dotenv';
import { getAccessToken } from '../src/services/cjApi.js';
dotenv.config();

async function test() {
  const token = (await getAccessToken(true)).accessToken;
  const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=2507290913441604900`, {
    method: 'GET',
    headers: { 'CJ-Access-Token': token, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  console.log(data.data.description);
}
test();
