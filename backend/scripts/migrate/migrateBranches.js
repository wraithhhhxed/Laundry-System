// backend/scripts/migrate/migrateBranches.js
//
// Paggamit (mula sa backend folder):
//   npx tsx scripts/migrate/migrateBranches.js
//
// Binabasa ang branches.bson mula sa mongodump backup, tapos ini-insert sa
// Postgres/Neon gamit ang Prisma. Idempotent — kung existing na ang isang
// branch (by id), nilalaktawan na lang.

import 'dotenv/config'
import { readBsonDocs } from './lib/readBson.js'
import { PrismaClient } from '../../src/generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// I-adjust kung iba ang path ng backup mo
const BSON_PATH = 'C:/Users/cell2/Desktop/mongo-backup/laundryDB/branches.bson'

const run = async () => {
  const docs = readBsonDocs(BSON_PATH)
  console.log(`Nabasa: ${docs.length} branches mula sa backup.`)

  let created = 0
  let skipped = 0

  for (const doc of docs) {
    const id = doc._id.toString()

    const existing = await prisma.branch.findUnique({ where: { id } })
    if (existing) {
      skipped++
      continue
    }

    await prisma.branch.create({
      data: {
        id,
        name:        doc.name ?? '',
        email:       doc.email,
        password:    doc.password ?? '',
        phone:       doc.phone ?? '',
        image:       doc.image ?? '',
        speciality:  Array.isArray(doc.speciality) ? doc.speciality : [],
        about:       doc.about ?? '',
        fees:        doc.fees ?? 0,
        address:     doc.address ?? {},
        available:   doc.available ?? true,
        slotsBooked: doc.slotsBooked ?? {},
        date:        doc.date != null ? BigInt(doc.date) : BigInt(0),
      },
    })
    created++
  }

  console.log(`✅  Nagawa: ${created} bagong branch, nilaktawan (existing na): ${skipped}`)
  await prisma.$disconnect()
}

run().catch(async (err) => {
  console.error('❌  May error habang nag-mi-migrate:', err)
  await prisma.$disconnect()
  process.exit(1)
})