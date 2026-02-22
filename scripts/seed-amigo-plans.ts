import { PrismaClient } from '@prisma/client'
import { AMIGO_MTN_PLANS, AMIGO_GLO_PLANS } from '../lib/constants/data-plans'
import * as dotenv from 'dotenv'

dotenv.config()

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
  console.log('🚀 Seeding Amigo Plans...')
  
  try {
    const plans = [...AMIGO_MTN_PLANS, ...AMIGO_GLO_PLANS]
    
    for (const plan of plans) {
      console.log(`Processing ${plan.networkName} - ${plan.dataCapacity} (ID: ${plan.planId})`)
      
      await prisma.amigoPlans.upsert({
        where: {
          planId_networkName: {
            planId: plan.planId,
            networkName: plan.networkName
          }
        },
        update: {
          dataCapacity: plan.dataCapacity,
          dataCapacityValue: plan.dataCapacityValue,
          validityDays: plan.validityDays,
          validityLabel: plan.validityLabel,
          amigoBasePrice: plan.amigoBasePrice,
          pricePerGB: plan.pricePerGB,
          efficiencyRating: plan.efficiencyRating,
          isEnabled: true
        },
        create: {
          planId: plan.planId,
          networkName: plan.networkName,
          dataCapacity: plan.dataCapacity,
          dataCapacityValue: plan.dataCapacityValue,
          validityDays: plan.validityDays,
          validityLabel: plan.validityLabel,
          amigoBasePrice: plan.amigoBasePrice,
          pricePerGB: plan.pricePerGB,
          efficiencyRating: plan.efficiencyRating,
          isEnabled: true
        }
      })
    }

    console.log(`✅ Successfully seeded ${plans.length} Amigo plans.`)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
