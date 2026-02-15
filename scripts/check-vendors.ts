
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVendors() {
  const vendors = await prisma.vendorConfig.findMany()
  console.log('Vendors in DB:', vendors.map(v => `${v.vendorName} (${v.adapterId}) - Enabled: ${v.isEnabled}`))
}

checkVendors()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
