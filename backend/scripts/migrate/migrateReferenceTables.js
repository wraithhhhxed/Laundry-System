// backend/scripts/migrate/migrateReferenceTables.js
//
// Paggamit (mula sa backend folder):
//   npx tsx scripts/migrate/migrateReferenceTables.js
//
// Isang script para sa 6 na standalone/reference collections — walang
// dependencies sa ibang tables, kaya pwedeng sabay-sabay: services,
// clothingtypes, extraservices, kgrates, products, promocodes.
//
// Idempotent — kung existing na ang isang record (by id), nilalaktawan.

import 'dotenv/config'
import { readBsonDocs } from './lib/readBson.js'
import { PrismaClient } from '../../src/generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// I-adjust kung iba ang path ng backup mo
const BACKUP_DIR = 'C:/Users/cell2/Desktop/mongo-backup/laundryDB'

// createdAt/updatedAt: ipasa lang kung meron talaga sa Mongo doc, kung wala
// hayaan na lang gamitin ang schema defaults (now() / @updatedAt).
const timestamps = (doc) => ({
  ...(doc.createdAt ? { createdAt: new Date(doc.createdAt) } : {}),
  ...(doc.updatedAt ? { updatedAt: new Date(doc.updatedAt) } : {}),
})

const COLLECTIONS = [
  {
    label: 'services',
    file:  'services.bson',
    model: prisma.service,
    mapData: (doc) => ({
      name:     doc.name ?? '',
      price:    doc.price ?? 0,
      image:    doc.image ?? null,
      isActive: doc.isActive ?? true,
      ...timestamps(doc),
    }),
  },
  {
    label: 'clothingtypes',
    file:  'clothingtypes.bson',
    model: prisma.clothingType,
    mapData: (doc) => ({
      name:     doc.name ?? '',
      isActive: doc.isActive ?? true,
      ...timestamps(doc),
      // OPEN QUESTION: price sa ClothingType — wala pa sa current schema,
      // kaya hindi natin isinasama kahit meron sa lumang Mongo backup.
    }),
  },
  {
    label: 'extraservices',
    file:  'extraservices.bson',
    model: prisma.extraService,
    mapData: (doc) => ({
      name:        doc.name ?? '',
      description: doc.description ?? '',
      fee:         doc.fee ?? 0,
      isActive:    doc.isActive ?? true,
      ...timestamps(doc),
    }),
  },
  {
    label: 'kgrates',
    file:  'kgrates.bson',
    model: prisma.kgRate,
    mapData: (doc) => ({
      kg:       doc.kg ?? 0,
      price:    doc.price ?? 0,
      isActive: doc.isActive ?? true,
      ...timestamps(doc),
    }),
  },
  {
    label: 'products',
    file:  'products.bson',
    model: prisma.product,
    mapData: (doc) => ({
      name:        doc.name ?? '',
      description: doc.description ?? '',
      price:       doc.price ?? 0,
      category:    doc.category ?? 'other',
      image:       doc.image ?? '',
      isActive:    doc.isActive ?? true,
      ...timestamps(doc),
    }),
  },
  {
    label: 'promocodes',
    file:  'promocodes.bson',
    model: prisma.promoCode,
    mapData: (doc) => ({
      code:           doc.code ?? '',
      description:    doc.description ?? '',
      discountType:   doc.discountType ?? '',
      discountValue:  doc.discountValue ?? 0,
      minOrderAmount: doc.minOrderAmount ?? 0,
      maxUses:        doc.maxUses ?? null,
      usedCount:      doc.usedCount ?? 0,
      expiresAt:      doc.expiresAt ? new Date(doc.expiresAt) : null,
      isActive:       doc.isActive ?? true,
      ...timestamps(doc),
    }),
  },
]

const migrateOne = async ({ label, file, model, mapData }) => {
  const docs = readBsonDocs(`${BACKUP_DIR}/${file}`)
  console.log(`\n— ${label} —`)
  console.log(`Nabasa: ${docs.length} records mula sa backup.`)

  let created = 0
  let skipped = 0

  for (const doc of docs) {
    const id = doc._id.toString()

    const existing = await model.findUnique({ where: { id } })
    if (existing) {
      skipped++
      continue
    }

    await model.create({ data: { id, ...mapData(doc) } })
    created++
  }

  console.log(`✅  ${label}: nagawa ${created}, nilaktawan (existing na) ${skipped}`)
}

const run = async () => {
  for (const config of COLLECTIONS) {
    await migrateOne(config)
  }
  console.log('\n🎉  Tapos na ang lahat ng reference tables.')
  await prisma.$disconnect()
}

run().catch(async (err) => {
  console.error('❌  May error habang nag-mi-migrate:', err)
  await prisma.$disconnect()
  process.exit(1)
})