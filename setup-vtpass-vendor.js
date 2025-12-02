/**
 * VTpass Vendor Setup Script
 * 
 * This script configures VTpass as the primary vendor for:
 * - Airtime (priority 100)
 * - Cable TV (priority 100)
 * - Electricity (priority 100)
 * 
 * Amigo remains primary for Data (priority 100 for data)
 * 
 * Run: node setup-vtpass-vendor.js
 */

const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Setting up VTpass as primary vendor...\n')

  // Check for VTpass credentials in environment
  const vtpassApiKey = process.env.VTPASS_API_KEY
  const vtpassPublicKey = process.env.VTPASS_PUBLIC_KEY
  const vtpassSecretKey = process.env.VTPASS_SECRET_KEY
  const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true'

  if (!vtpassApiKey || vtpassApiKey === 'your-vtpass-api-key') {
    console.log('⚠️  VTpass credentials not found in .env')
    console.log('   Please add your VTpass API keys to .env file:')
    console.log('   - VTPASS_API_KEY')
    console.log('   - VTPASS_PUBLIC_KEY')
    console.log('   - VTPASS_SECRET_KEY')
    console.log('   - VTPASS_USE_SANDBOX (true/false)\n')
    console.log('   Creating vendor config with placeholder credentials...\n')
  }

  const vtpassCredentials = {
    apiKey: vtpassApiKey || 'your-vtpass-api-key',
    publicKey: vtpassPublicKey || 'PK_your-vtpass-public-key',
    secretKey: vtpassSecretKey || 'SK_your-vtpass-secret-key',
    useSandbox: useSandbox,
  }

  // Upsert VTpass vendor configuration
  const vtpass = await prisma.vendorConfig.upsert({
    where: { adapterId: 'VTPASS' },
    update: {
      vendorName: 'VTpass',
      priority: 100, // Highest priority
      isEnabled: true,
      supportsAirtime: true,
      supportsData: false, // Amigo handles data
      supportsElectric: true,
      supportsCableTV: true,
      credentials: vtpassCredentials,
      isHealthy: true,
    },
    create: {
      vendorName: 'VTpass',
      adapterId: 'VTPASS',
      priority: 100,
      isEnabled: true,
      supportsAirtime: true,
      supportsData: false,
      supportsElectric: true,
      supportsCableTV: true,
      credentials: vtpassCredentials,
      balance: 0,
      isHealthy: true,
    },
  })

  console.log('✅ VTpass vendor configured:')
  console.log(`   ID: ${vtpass.id}`)
  console.log(`   Priority: ${vtpass.priority}`)
  console.log(`   Airtime: ${vtpass.supportsAirtime}`)
  console.log(`   Data: ${vtpass.supportsData}`)
  console.log(`   Electricity: ${vtpass.supportsElectric}`)
  console.log(`   Cable TV: ${vtpass.supportsCableTV}`)
  console.log(`   Sandbox Mode: ${useSandbox}\n`)

  // Lower priority of other vendors for airtime/TV/electricity
  const otherVendors = await prisma.vendorConfig.findMany({
    where: {
      adapterId: { not: 'VTPASS' },
    },
  })

  for (const vendor of otherVendors) {
    let updates = {}
    
    // Keep Amigo as primary for data
    if (vendor.adapterId === 'AMIGO') {
      updates = {
        priority: 100, // Same priority but VTpass doesn't do data
        supportsAirtime: false, // Let VTpass handle airtime
        supportsData: true,
        supportsElectric: false,
        supportsCableTV: false,
      }
    } else {
      // All other vendors become fallbacks
      updates = {
        priority: 50, // Lower priority
      }
    }

    await prisma.vendorConfig.update({
      where: { id: vendor.id },
      data: updates,
    })

    console.log(`📝 Updated ${vendor.vendorName}:`)
    console.log(`   Priority: ${updates.priority || vendor.priority}`)
    if (vendor.adapterId === 'AMIGO') {
      console.log(`   Now primary for: Data only`)
    }
    console.log('')
  }

  // Create service routing entries for VTpass services
  console.log('🔧 Setting up service routing...\n')

  // Define the services VTpass will handle
  const vtpassServices = [
    { serviceType: 'AIRTIME', networkType: 'MTN' },
    { serviceType: 'AIRTIME', networkType: 'GLO' },
    { serviceType: 'AIRTIME', networkType: 'AIRTEL' },
    { serviceType: 'AIRTIME', networkType: '9MOBILE' },
    { serviceType: 'ELECTRICITY', networkType: null },
    { serviceType: 'CABLE_TV', networkType: null },
  ]

  for (const service of vtpassServices) {
    try {
      // Check if routing exists
      const existing = await prisma.serviceRouting.findFirst({
        where: {
          serviceType: service.serviceType,
          networkType: service.networkType,
        },
      })

      if (existing) {
        // Update to use VTpass
        await prisma.serviceRouting.update({
          where: { id: existing.id },
          data: {
            primaryVendorId: vtpass.id,
            isActive: true,
          },
        })
        console.log(`   ✓ Updated ${service.serviceType}${service.networkType ? ` (${service.networkType})` : ''} routing to VTpass`)
      } else {
        // Create new routing
        await prisma.serviceRouting.create({
          data: {
            serviceType: service.serviceType,
            networkType: service.networkType,
            primaryVendorId: vtpass.id,
            isActive: true,
          },
        })
        console.log(`   ✓ Created ${service.serviceType}${service.networkType ? ` (${service.networkType})` : ''} routing for VTpass`)
      }
    } catch (error) {
      // Table might not exist or have different schema
      console.log(`   ⚠️  Could not set routing for ${service.serviceType}: ${error.message}`)
    }
  }

  console.log('\n✅ VTpass setup complete!')
  console.log('\n📋 Summary:')
  console.log('   - VTpass: Primary for Airtime, TV, Electricity (Priority 100)')
  console.log('   - Amigo: Primary for Data (Priority 100)')
  console.log('   - Others: Fallback (Priority 50)')
  console.log('\n🔑 Next Steps:')
  console.log('   1. Add your VTpass API credentials to .env file')
  console.log('   2. Go to Admin Dashboard > Vendors to verify configuration')
  console.log('   3. Click "Sync Balances" to test the connection')
}

main()
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
