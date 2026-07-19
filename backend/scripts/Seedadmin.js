// backend/scripts/seedAdmin.js
//
// Gumagawa ng unang Admin account sa Postgres, base sa SEED_ADMIN_EMAIL/
// SEED_ADMIN_PASSWORD/SEED_ADMIN_NAME mula .env. Idempotent — kung meron
// nang Admin sa parehong email, hindi na gagawa ng bago.
import bcrypt from 'bcrypt';
import prisma from '../src/config/prismaClient.js';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME;

  if (!email || !password || !name) {
    throw new Error('Kailangan ng SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, at SEED_ADMIN_NAME sa .env');
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Meron nang Admin account sa email na '${email}'. Wala nang gagawin.`);
    await prisma.$disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: { name, email, password: hashedPassword },
  });

  console.log('Nagawa ang unang Admin account:');
  console.log({ id: admin.id, name: admin.name, email: admin.email });

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});