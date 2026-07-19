// backend/scripts/peekReferenceData.js
//
// I-print lahat ng reference records (Service, Branch, User, ClothingType,
// Product, PromoCode) mula Postgres, para may totoong IDs tayong gagamitin
// sa seedAppointments.js.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const services = await prisma.service.findMany({
    select: { id: true, name: true, price: true, isActive: true },
  });
  console.log('\n=== SERVICES ===');
  console.log(JSON.stringify(services, null, 2));

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true },
  });
  console.log('\n=== BRANCHES ===');
  console.log(JSON.stringify(branches, null, 2));

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  console.log('\n=== USERS ===');
  console.log(JSON.stringify(users, null, 2));

  const clothingTypes = await prisma.clothingType.findMany({
    select: { id: true, name: true, isActive: true },
  });
  console.log('\n=== CLOTHING TYPES ===');
  console.log(JSON.stringify(clothingTypes, null, 2));

  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true, isActive: true },
  });
  console.log('\n=== PRODUCTS ===');
  console.log(JSON.stringify(products, null, 2));

  const promoCodes = await prisma.promoCode.findMany({
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      minOrderAmount: true,
      isActive: true,
    },
  });
  console.log('\n=== PROMO CODES ===');
  console.log(JSON.stringify(promoCodes, null, 2));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});