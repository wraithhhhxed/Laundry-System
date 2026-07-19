// backend/scripts/migrate/migrateSettings.js
//
// Paggamit (mula sa backend folder):
//   npx tsx scripts/migrate/migrateSettings.js
//
// Binabasa ang settings.bson. Espesyal na tratamiento sa "refundReasons":
// kung luma pa ang shape (may 'cancelled' sa loob ng applicableStatuses
// array, walang appliesToCancelled), awtomatikong ico-convert papunta sa
// bagong shape bago i-insert.
//
// Idempotent — kung existing na ang isang setting (by key), nilalaktawan.

import 'dotenv/config'
import { readBsonDocs } from './lib/readBson.js'
import { PrismaClient } from '../../src/generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const BSON_PATH = 'C:/Users/cell2/Desktop/mongo-backup/laundryDB/settings.bson'

// Kung "cancelled" ay nasa loob ng applicableStatuses array (lumang shape),
// alisin ito doon at ilagay bilang hiwalay na appliesToCancelled boolean.
const transformRefundReasons = (value) => {
  if (!Array.isArray(value)) return value

  return value.map((item) => {
    const hasCancelledInList = Array.isArray(item.applicableStatuses)
      && item.applicableStatuses.includes('cancelled')

    return {
      reason:             item.reason,
      applicableStatuses: (item.applicableStatuses ?? []).filter((s) => s !== 'cancelled'),
      appliesToCancelled: item.appliesToCancelled ?? hasCancelledInList,
      isActive:           item.isActive ?? true,
    }
  })
}

const run = async () => {
  const docs = readBsonDocs(BSON_PATH)
  console.log(`Nabasa: ${docs.length} settings mula sa backup.`)

  let created = 0
  let skipped = 0

  for (const doc of docs) {
    const existing = await prisma.setting.findUnique({ where: { key: doc.key } })
    if (existing) {
      skipped++
      continue
    }

    let value = doc.value
    if (doc.key === 'refundReasons') {
      value = transformRefundReasons(value)
      console.log(`  ℹ️  refundReasons: na-convert papunta sa bagong shape (appliesToCancelled)`)
    }

    await prisma.setting.create({
      data: {
        key:         doc.key,
        value,
        description: doc.description ?? null,
        ...(doc.createdAt ? { createdAt: new Date(doc.createdAt) } : {}),
        ...(doc.updatedAt ? { updatedAt: new Date(doc.updatedAt) } : {}),
      },
    })
    created++
  }

  console.log(`✅  Nagawa: ${created} bagong setting, nilaktawan (existing na) ${skipped}`)
  await prisma.$disconnect()
}

run().catch(async (err) => {
  console.error('❌  May error habang nag-mi-migrate:', err)
  await prisma.$disconnect()
  process.exit(1)
})