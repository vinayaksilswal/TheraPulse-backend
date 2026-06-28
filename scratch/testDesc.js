import prisma from '../server/db.js';

async function check() {
  const p = await prisma.product.findUnique({where: {pid: '2507290913441604900'}});
  console.log(p.description);
}
check();
