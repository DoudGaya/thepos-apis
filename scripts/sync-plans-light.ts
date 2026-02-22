import { PrismaClient } from '@prisma/client'
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter'
import * as dotenv from 'dotenv'

dotenv.config()

// Increase connection timeout to avoid pool exhaustion
// Append parameters to DATABASE_URL if not present
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
  console.log('🚀 Starting LIGHT Plan Sync for VTPASS...')
  
  try {
    // 1. Check if Vendor Config exists
    let config = await prisma.vendorConfig.findFirst({
        where: { adapterId: 'VTPASS' }
    })
    
    // Default credentials from ENV
    const defaultCreds = {
        apiKey: process.env.VTPASS_API_KEY || '',
        publicKey: process.env.VTPASS_PUBLIC_KEY || '',
        secretKey: process.env.VTPASS_SECRET_KEY || '',
        useSandbox: process.env.VTPASS_USE_SANDBOX === 'true'
    }

    if (!config) {
        console.log('⚠️ VTPASS config not found in DB. Creating default...')
        // Create basic config if missing
        config = await prisma.vendorConfig.create({
            data: {
                adapterId: 'VTPASS',
                vendorName: 'VTPass',
                isEnabled: true,
                supportsData: true,
                priority: 1,
                credentials: JSON.parse(JSON.stringify(defaultCreds))
            }
        })
    }

    if (!config) {
        throw new Error('Failed to find or create vendor config.')
    }

    // 2. Instantiate Adapter
    // Merge DB credentials with Env defaults if some are missing in DB
    const dbCreds = config.credentials as any || {}
    const adapterConfig = {
        apiKey: dbCreds.apiKey || defaultCreds.apiKey,
        publicKey: dbCreds.publicKey || defaultCreds.publicKey,
        secretKey: dbCreds.secretKey || defaultCreds.secretKey,
        useSandbox: dbCreds.useSandbox !== undefined ? dbCreds.useSandbox : defaultCreds.useSandbox
    }
    
    if (!adapterConfig.apiKey || !adapterConfig.secretKey) {
        throw new Error('Missing VTPASS API/Secret Key in both DB and ENV')
    }

    const adapter = new VTPassAdapter(adapterConfig)

    // 3. Fetch Plans
    const networks: any[] = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']
    
    for (const net of networks) {
        console.log(`\n📡 Fetching ${net}...`)
        try {
            const plans = await adapter.getPlans('DATA', net)
            console.log(`   Found ${plans.length} plans.`)
            
            // 4. Save to DB
            for (const plan of plans) {
                // Parsing logic...
                let size = plan.name
                // Regex to match size: 1.5GB, 500MB, 1TB, 6.2G, 100M, etc.
                // Do not strip spaces globally to avoid merging numbers like "T2 6.2G" -> "26.2G"
                // Match with optional space but not multiple numbers merged.
                const sizeMatch = plan.name.toUpperCase().match(/(\d+(\.\d+)?\s*(MB|GB|TB|M|G|T)\b)/) || 
                                  plan.name.toUpperCase().match(/(\d+(\.\d+)?\s*(MB|GB|TB|M|G|T))/)
                
                if (sizeMatch) {
                    size = sizeMatch[0].replace(/\s/g, '') // remove inner space e.g. "1.5 GB" -> "1.5GB"
                    // Normalize units
                    if (size.endsWith('G')) size += 'B'
                    if (size.endsWith('M')) size += 'B'
                    if (size.endsWith('T')) size += 'B'
                }
                
                // Validity logic...
                let validity = plan.validity || '30 days'
                const nameLower = plan.name.toLowerCase()
                if (nameLower.includes('daily') || nameLower.includes('1 day')) validity = '1 day'
                else if (nameLower.includes('weekly') || nameLower.includes('7 days')) validity = '7 days'
                // ... add other validity rules ...
                
                await prisma.dataPlan.upsert({
                    where: {
                        vendorId_planId: {
                            vendorId: config.id, 
                            planId: plan.id
                        }
                    },
                    update: {
                        network: net,
                        size: size,
                        validity: validity,
                        costPrice: plan.price,
                        isActive: true
                    },
                    create: {
                        vendorId: config.id,
                        planId: plan.id,
                        network: net,
                        size: size,
                        validity: validity,
                        costPrice: plan.price,
                        sellingPrice: plan.price + 50, // Default markup
                        isActive: true,
                        planType: 'ALL'
                    }
                })
            }
            console.log(`   Saved ${plans.length} plans for ${net}.`)
            
        } catch (e: any) {
            console.error(`   Failed to sync ${net}:`, e.message)
        }
    }

  } catch (error) {
    console.error('❌ Script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
