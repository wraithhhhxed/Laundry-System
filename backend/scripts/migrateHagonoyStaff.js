// backend/scripts/migrateHagonoyStaff.js
//
// One-time script para ilipat yung existing Hagonoy Branch email/password
// papunta sa bagong BranchStaff table, bilang unang BRANCH_ADMIN record.
// Base sa MIGRATE_BRANCH_EMAIL/MIGRATE_BRANCH_PASSWORD/MIGRATE_BRANCH_ID
// mula sa .env. Idempotent — kung meron nang record sa parehong email,
// hindi na gagawa ng bago.
import bcrypt from 'bcrypt'
import prisma from '../src/config/prismaClient.js'

async function main() {
  const branchEmail = process.env.MIGRATE_BRANCH_EMAIL
  const plainPassword = process.env.MIGRATE_BRANCH_PASSWORD
  const branchId = process.env.MIGRATE_BRANCH_ID

  if (!branchEmail || !plainPassword || !branchId) {
    throw new Error('Kailangan ng MIGRATE_BRANCH_EMAIL, MIGRATE_BRANCH_PASSWORD, at MIGRATE_BRANCH_ID sa .env')
  }

  const existing = await prisma.branchStaff.findUnique({ where: { email: branchEmail } })
  if (existing) {
    console.log(`Meron nang BranchStaff record sa email na '${branchEmail}'. Wala nang gagawin.`)
    await prisma.$disconnect()
    return
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  const newStaff = await prisma.branchStaff.create({
    data: {
      firstName: 'Hagonoy',
      lastName: 'Admin',
      email: branchEmail,
      password: hashedPassword,
      role: 'BRANCH_ADMIN',
      branchId: branchId,
      isActive: true
    }
  })

  console.log('Nagawa na ang BranchStaff record:')
  console.log({ id: newStaff.id, email: newStaff.email, role: newStaff.role, branchId: newStaff.branchId })

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})