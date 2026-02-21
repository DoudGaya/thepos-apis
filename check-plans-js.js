
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const plans = await prisma.dataPlan.findMany({
    select: {
      network: true,
      planType: true
    }
  })

  const networks = new Set()
  const planTypes = new Set()
  
  plans.forEach(p => {
    networks.add(p.network)
    planTypes.add(p.planType)
  })

  console.log('Networks found:', Array.from(networks))
  console.log('Plan Types found:', Array.from(planTypes))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
