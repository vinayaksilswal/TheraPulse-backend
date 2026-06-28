async function run() {
  const authRes = await fetch('http://localhost:5000/api/admin/cj/auth');
  const auth = await authRes.json();
  const token = auth.accessToken;
  const res = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=2507290913441604900', {
    headers: { 'CJ-Access-Token': token }
  });
  const data = await res.json();
  console.log(JSON.stringify(data));
}
run();
