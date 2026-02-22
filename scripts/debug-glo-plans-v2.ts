import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()
const prisma = new PrismaClient()

async function main() {
    console.log('--- Debugging Glo Plans ---')
    
    // 1. Check Service Routing
    const routing = await prisma.serviceRouting.findUnique({
        where: { serviceType_network: { serviceType: 'DATA', network: 'GLO' } },
        include: { primaryVendor: true }
    })
    console.log('Glo Routing Primary:', routing?.primaryVendor?.adapterId)

    // 2. Check Data Plans in DB
    const plans = await prisma.dataPlan.findMany({
        where: { network: 'GLO', isActive: true },
        include: { vendor: { select: { adapterId: true } } },
        orderBy: { costPrice: 'asc' },
        take: 10
    })
    
    console.log(`Found ${plans.length} Glo plans.`)
    plans.forEach(p => {
        console.log(`- Plan: ${p.size} | ID: ${p.planId} | Vendor: ${p.vendor?.adapterId} | Cost: ${p.costPrice}`)
    })

    await prisma.$disconnect()
}

main()
