import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
    // 1. Get configurations
    console.log('Fetching Vendor Configs...')
    const configs = await prisma.vendorConfig.findMany()
    console.log('Current Vendor Configs:')
    console.table(configs.map(c => ({ 
        id: c.id, 
        adapter: c.adapterId, 
        priority: c.priority, 
        isPrimary: c.isPrimary 
    })))

    const amigo = configs.find(c => c.adapterId === 'AMIGO')
    const vtpass = configs.find(c => c.adapterId === 'VTPASS')
    const subandgain = configs.find(c => c.adapterId === 'SUBANDGAIN')

    // 2. Update Priorities
    if (amigo) {
        await prisma.vendorConfig.update({
            where: { id: amigo.id },
            data: { priority: 1, isPrimary: true }
        })
        console.log('Updated Amigo to Priority 1')
    } else {
        console.warn('AMIGO vendor config NOT FOUND!')
    }
    
    if (vtpass) {
        await prisma.vendorConfig.update({
            where: { id: vtpass.id },
            data: { priority: 2, isPrimary: false }
        })
        console.log('Updated VTPass to Priority 2')
    } else {
        console.warn('VTPASS vendor config NOT FOUND!')
    }

    if (subandgain) {
        await prisma.vendorConfig.update({
            where: { id: subandgain.id },
            data: { priority: 3, isPrimary: false }
        })
        console.log('Updated SubAndGain to Priority 3')
    } else {
        console.warn('SUBANDGAIN vendor config NOT FOUND!')
    }

    // 3. Update Service Routing for DATA
    // Amigo only supports DATA
    // networks: MTN, GLO, AIRTEL, 9MOBILE
    if (amigo && vtpass) {
        const networks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']
        
        for (const net of networks) {
            // Using upsert to create if not exists
            await prisma.serviceRouting.upsert({
                where: {
                    serviceType_network: {
                        serviceType: 'DATA',
                        network: net
                    }
                },
                update: {
                    primaryVendorId: amigo.id,
                    fallbackVendorId: vtpass.id
                },
                create: {
                    serviceType: 'DATA',
                    network: net,
                    primaryVendorId: amigo.id,
                    fallbackVendorId: vtpass.id
                }
            })
            console.log(`Updated DATA routing for ${net}: Primary=Amigo, Fallback=VTPass`)
        }
    } else {
        console.warn('Skipping ServiceRouting update because AMIGO or VTPASS config is missing.')
    }

    // Display final state
    const newRoutings = await prisma.serviceRouting.findMany({ 
        where: { serviceType: 'DATA' },
        include: {
            primaryVendor: true,
            fallbackVendor: true
        }
    })
    
    console.log('New DATA Routings:')
    console.table(newRoutings.map(r => ({ 
        net: r.network, 
        primary: r.primaryVendor?.adapterId || r.primaryVendorId,
        fallback: r.fallbackVendor?.adapterId || r.fallbackVendorId
    })))

    await prisma.$disconnect()
}

main()
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
