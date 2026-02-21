
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const plans = await prisma.dataPlan.groupBy({
    by: ['network', 'planType'],
    _count: {
      id: true
    }
  })

  console.log('Plan Counts by Network and Type:')
  console.table(plans.map(p => ({
    Network: p.network,
    Type: p.planType,
    Count: p._count.id
  })))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
