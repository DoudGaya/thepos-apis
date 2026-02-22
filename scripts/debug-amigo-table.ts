import { PrismaClient } from '@prisma/client'

// Increase connection timeout to avoid pool exhaustion
const url = process.env.DATABASE_URL || ''
const newUrl = url.includes('?') 
  ? url + '&connection_limit=5&pool_timeout=60' 
  : url + '?connection_limit=5&pool_timeout=60'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: newUrl
        }
    }
})

async function main() {
  console.log('--- Checking AmigoPlans table ---')
  const amigoPlans = await prisma.amigoPlans.findMany({ where: { networkName: 'GLO' } })
  console.log(`Found ${amigoPlans.length} Amigo Glo plans.`)
  amigoPlans.forEach(p => console.log(`- ID: ${p.planId} | Name: ${p.dataCapacity}`))
  await prisma.$disconnect()
}
main()
