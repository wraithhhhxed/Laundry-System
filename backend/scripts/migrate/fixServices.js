// backend/scripts/migrate/fixServices.js
//
// Paggamit (mula sa backend folder):
//   npx tsx scripts/migrate/fixServices.js
//
// Hindi buburahin ang 8 lumang dummy services (baka may appointments na
// naka-reference) — i-de-deactivate lang (isActive: false) para hindi na
// lumabas sa customer-facing menu. Tapos idadagdag ang tamang 4 na fixed
// package prices base sa ground truth interview.
//
// Idempotent — kung existing na ang service name, nilalaktawan.

import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Ground truth: interview kay ate staff (2026-07-09), Selfie Wash Hagonoy branch
const CORRECT_SERVICES = [
  { name: 'DIY Self-Service',                       price: 140 },
  { name: 'Drop-off (1 Sabon 1 Downy)',              price: 180 },
  { name: 'Drop-off (2 Sabon 2 Downy + Booster)',    price: 250 },
  { name: 'Full Service (1 Sabon 1 Downy Wash-Dry-Fold)', price: 235 },
  { name: 'Full Service (2 Sabon 2 Downy + Booster)',     price: 250 },
]

const run = async () => {
  // ── 1. I-deactivate ang lumang dummy services LANG (hindi kasama ang mga
  //    tamang service na idinagdag na natin — mahalaga ito sa re-run) ──────
  const correctNames = CORRECT_SERVICES.map((s) => s.name)
  const deactivated = await prisma.service.updateMany({
    where: { isActive: true, name: { notIn: correctNames } },
    data:  { isActive: false },
  })
  console.log(`✅  Na-deactivate: ${deactivated.count} lumang services (dummy/test data)`)

  // ── 2. Idagdag ang tamang fixed-package services ─────────────────────────
  let created = 0
  let skipped = 0

  for (const svc of CORRECT_SERVICES) {
    const existing = await prisma.service.findUnique({ where: { name: svc.name } })
    if (existing) {
      skipped++
      continue
    }

    await prisma.service.create({
      data: {
        name:     svc.name,
        price:    svc.price,
        isActive: true,
      },
    })
    created++
  }

  console.log(`✅  Nagawa: ${created} bagong tamang service, nilaktawan (existing na) ${skipped}`)

  await prisma.$disconnect()
}

run().catch(async (err) => {
  console.error('❌  May error:', err)
  await prisma.$disconnect()
  process.exit(1)
})