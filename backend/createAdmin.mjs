// One-off script para gumawa ng Super Admin account.
// Patakbuhin: npx tsx createAdmin.mjs
// Pwede mo itong burahin pagkatapos gamitin.

import 'dotenv/config'
import { PrismaClient } from './src/generated/prisma/index.js'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Kinukuha mula sa .env — SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD

if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Kulang ang SEED_ADMIN_NAME / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD sa .env')
  process.exit(1)
}

async function main() {
  const existing = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } })
  if (existing) {
    console.log('May existing na admin sa email na ito:', ADMIN_EMAIL)
    return
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt)

  const admin = await prisma.admin.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      isActive: true,
    },
  })

  console.log('Nagawa na ang admin account:')
  console.log({ id: admin.id, name: admin.name, email: admin.email })
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
