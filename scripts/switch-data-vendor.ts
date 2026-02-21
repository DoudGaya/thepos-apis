import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting data vendor switch...')

  try {
    // 1. Find AMIGO vendor
    const amigoVendor = await prisma.vendorConfig.findUnique({
      where: { adapterId: 'AMIGO' }
    })

    if (amigoVendor) {
      console.log(`✅ Found AMIGO vendor (ID: ${amigoVendor.id})`)
      
      const deactivateResult = await prisma.dataPlan.updateMany({
        where: { vendorId: amigoVendor.id },
        data: { isActive: false }
      })

      console.log(`📉 Deactivated ${deactivateResult.count} AMIGO plans`)
    } else {
      console.log('⚠️ AMIGO vendor not found')
    }

    // 2. Find SUBANDGAIN vendor
    const subVendor = await prisma.vendorConfig.findUnique({
      where: { adapterId: 'SUBANDGAIN' }
    })

    if (subVendor) {
      console.log(`✅ Found SUBANDGAIN vendor (ID: ${subVendor.id})`)
      
      const activateResult = await prisma.dataPlan.updateMany({
        where: { vendorId: subVendor.id },
        data: { isActive: true }
      })

      console.log(`📈 Activated ${activateResult.count} SUBANDGAIN plans`)
    } else {
      console.log('⚠️ SUBANDGAIN vendor not found')
    }

  } catch (error) {
    console.error('❌ Error switching vendors:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
