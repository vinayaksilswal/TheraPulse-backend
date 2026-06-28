import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=2507290913441604900`, {
    method: 'GET',
    headers: { 'CJ-Access-Token': process.env.CJ_API_KEY, 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  console.log(data.data.description);
}
test();
