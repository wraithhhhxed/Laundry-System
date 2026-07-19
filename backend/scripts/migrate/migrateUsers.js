// backend/scripts/migrate/migrateUsers.js
//
// Paggamit (mula sa backend folder):
//   node scripts/migrate/migrateUsers.js
//
// Binabasa ang users.bson mula sa mongodump backup, tapos ini-insert sa
// Postgres/Neon gamit ang Prisma. Idempotent — kung existing na ang isang
// user (by id), nilalaktawan na lang, hindi gumagawa ng duplicate.

import 'dotenv/config'
import { readBsonDocs } from './lib/readBson.js'
import { PrismaClient } from '../../src/generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// I-adjust kung iba ang path ng backup mo
const BSON_PATH = 'C:/Users/cell2/Desktop/mongo-backup/laundryDB/users.bson'

const run = async () => {
  const docs = readBsonDocs(BSON_PATH)
  console.log(`Nabasa: ${docs.length} users mula sa backup.`)

  let created = 0
  let skipped = 0

  for (const doc of docs) {
    const id = doc._id.toString()

    const existing = await prisma.user.findUnique({ where: { id } })
    if (existing) {
      skipped++
      continue
    }

    await prisma.user.create({
      data: {
        id,
        name:                  doc.name ?? '',
        email:                 doc.email,
        password:              doc.password ?? null,
        googleId:              doc.googleId ?? null,
        image:                 doc.image ?? '...',
        address:               doc.address ?? {},
        gender:                doc.gender ?? 'Not Selected',
        dob:                   doc.dob ?? 'Not Selected',
        phone:                 doc.phone ?? '0000000000',
        isActive:              doc.isActive ?? true,
        resetPasswordToken:    doc.resetPasswordToken ?? null,
        resetPasswordExpires:  doc.resetPasswordExpires ?? null,
      },
    })
    created++
  }

  console.log(`✅  Nagawa: ${created} bagong user, nilaktawan (existing na): ${skipped}`)
  await prisma.$disconnect()
}

run().catch(async (err) => {
  console.error('❌  May error habang nag-mi-migrate:', err)
  await prisma.$disconnect()
  process.exit(1)
})