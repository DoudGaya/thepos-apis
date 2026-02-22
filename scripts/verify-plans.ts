import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.dataPlan.count()
  console.log(`Total Data Plans: ${count}`)
  
  const plans = await prisma.dataPlan.findMany({
    take: 5,
    orderBy: { updatedAt: 'desc' }
  })
  
  console.log('Sample Plans (Latest 5):')
  console.table(plans.map(p => ({
    net: p.network,
    size: p.size,
    valid: p.validity,
    id: p.planId,
    cost: p.costPrice
  })))
  
  await prisma.$disconnect()
}
main()
