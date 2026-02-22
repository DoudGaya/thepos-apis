import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const plans = await prisma.dataPlan.findMany({
    where: { 
        network: 'MTN', 
        vendor: { adapterId: 'AMIGO' }
    },
    take: 5
  })
  
  console.log('AMIGO Plans:', plans.map(p => ({
      id: p.id,
      planId: p.planId, // This is what gets sent to vendor
      size: p.size,
      price: p.costPrice
  })))

  await prisma.$disconnect()
}

main()
