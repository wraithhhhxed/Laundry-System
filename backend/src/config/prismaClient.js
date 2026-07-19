// backend/src/config/prismaClient.js
//
// Shared PrismaClient singleton — ito ang dapat i-import ng LAHAT ng
// repositories, para hindi gumawa ng bagong DB connection pool bawat file.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export default prisma;