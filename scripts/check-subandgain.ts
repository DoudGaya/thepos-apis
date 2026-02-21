
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Checking Vendors and Plans ---')

  try {
    // 1. Check SubAndGain vendor
    const subAndGainVendor = await prisma.vendorConfig.findFirst({
        where: { adapterId: 'SUBANDGAIN' }
    })
    console.log('\n1. SubAndGain Vendor:')
    if (subAndGainVendor) {
        console.log(`- Found (ID: ${subAndGainVendor.id}, Adapter: ${subAndGainVendor.adapterId})`)
    } else {
        console.log('- Not Found')
    }

    // 2. Show one sample plan ID for a SubAndGain plan.
    console.log('\n2. SubAndGain Plan Sample:')
    const subAndGainPlan = await prisma.dataPlan.findFirst({
        where: {
            vendorId: subAndGainVendor?.id,
            isActive: true
        }
    })

    if (subAndGainPlan) {
        console.log(`- Plan Network: ${subAndGainPlan.network}`)
        console.log(`- Plan Size: ${subAndGainPlan.size}`)
        console.log(`- Plan ID: ${subAndGainPlan.planId}`)
        console.log(`- Cost Price: ${subAndGainPlan.costPrice}`)
        console.log(`- Type: ${subAndGainPlan.planType}`)
    } else {
        console.log('- No active SubAndGain plans found.')
    }

    // 3. Check if DataPlan table has vendor.adapterId='AMIGO' plans still active.
    console.log('\n3. Checking for active AMIGO plans:')
    const amigoVendor = await prisma.vendorConfig.findFirst({
        where: { adapterId: 'AMIGO' }
    })
    
    if (amigoVendor) {
        const activeAmigoPlansCount = await prisma.dataPlan.count({
            where: {
                vendorId: amigoVendor.id,
                isActive: true
            }
        })
        console.log(`- Active AMIGO plans count: ${activeAmigoPlansCount}`)

        if (activeAmigoPlansCount > 0) {
            const sampleAmigo = await prisma.dataPlan.findFirst({
                where: {
                    vendorId: amigoVendor.id,
                    isActive: true
                },
                select: { id: true, planId: true, network: true, size: true, isActive: true }
            })
            console.log(`- Sample Active AMIGO Plan: ${JSON.stringify(sampleAmigo)}`)
        }
    } else {
        console.log('- AMIGO Vendor not found.')
    }

  } catch (error) {
    console.error('Error checking configurations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
