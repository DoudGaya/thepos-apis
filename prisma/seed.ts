import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('DEBUG ENV:', {
    VTU: process.env.VTU_NG_USERNAME,
    AMIGO: process.env.AMIGO_API_TOKEN
  })
  // Create Super Admin Role
  const superAdminRole = await prisma.adminRole.upsert({
    where: { name: 'Super Admin' },
    update: {
      permissions: ['*'] 
    },
    create: {
      name: 'Super Admin',
      description: 'Full access to all system features',
      permissions: ['*']
    }
  })
  console.log('✅ Super Admin Role ensured:', superAdminRole.name)

  // Create admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@NillarPay.com' },
    update: {
      // Ensure existing admin gets the role if missing
      adminRoleId: superAdminRole.id
    },
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@NillarPay.com',
      phone: '08000000000',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: adminPassword,
      isVerified: true,
      referralCode: 'ADMIN001',
      role: 'ADMIN',
      credits: 10000,
      adminRoleId: superAdminRole.id
    },
  })

  // Seed Vendors
  console.log('\n🔌 Seeding vendors...')
  
  const vendors = [
    {
        vendorName: 'Amigo',
        adapterId: 'AMIGO',
        type: 'ALL',
        priority: 90,
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: false,
        supportsCableTV: false,
        credentials: {
          apiToken: process.env.AMIGO_API_TOKEN || '',
          baseUrl: process.env.AMIGO_BASE_URL || 'https://amigo.ng/api'
        },
    },
    {
        vendorName: 'SubAndGain',
        adapterId: 'SUBANDGAIN',
        type: 'ALL',
        priority: 70,
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: true,
        supportsCableTV: true,
        credentials: {
          username: process.env.SUBANDGAIN_USERNAME || '',
          apiKey: process.env.SUBANDGAIN_API_KEY || ''
        },
    },
    {
        vendorName: 'VTPass',
        adapterId: 'VTPASS',
        type: 'UTILITY',
        priority: 85,
        supportsAirtime: true,
        supportsData: true,
        supportsElectric: true,
        supportsCableTV: true,
        credentials: {
          apiKey: process.env.VTPASS_API_KEY || '',
          publicKey: process.env.VTPASS_PUBLIC_KEY || '',
          secretKey: process.env.VTPASS_SECRET_KEY || ''
        },
    }
  ]

  for (const vendor of vendors) {
    console.log(`Checking vendor: ${vendor.vendorName}`)
    if (vendor.adapterId !== 'VTPASS' && !vendor.credentials?.['username'] && !vendor.credentials?.['apiToken'] && !vendor.credentials?.['userId']) {
        console.warn(`⚠️ Skipping ${vendor.vendorName} due to missing credentials keys:`, Object.keys(vendor.credentials))
        // continue // Commented out for now to force seed if env vars are missing but we want the record
    }

    await prisma.vendorConfig.upsert({
      where: { adapterId: vendor.adapterId },
      update: {
        vendorName: vendor.vendorName,
        type: vendor.type as any,
        credentials: vendor.credentials,
        supportsAirtime: vendor.supportsAirtime,
        supportsData: vendor.supportsData,
        supportsElectric: vendor.supportsElectric,
        supportsCableTV: vendor.supportsCableTV,
      },
      create: {
        vendorName: vendor.vendorName,
        adapterId: vendor.adapterId,
        type: vendor.type as any,
        priority: vendor.priority,
        credentials: vendor.credentials,
        supportsAirtime: vendor.supportsAirtime,
        supportsData: vendor.supportsData,
        supportsElectric: vendor.supportsElectric,
        supportsCableTV: vendor.supportsCableTV,
      },
    })
    console.log(`✅ Upserted vendor: ${vendor.vendorName}`)
  }

  // Create test user
  const testPassword = await bcrypt.hash('password123', 12)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      phone: '08012345678',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: testPassword,
      isVerified: true,
      referralCode: 'TEST001',
      role: 'USER',
      credits: 1000,
    },
  })

  console.log('Seed data created:')
  console.log('Admin user:', admin)
  console.log('Test user:', testUser)

  // Seed default profit margins
  console.log('\n🌱 Seeding profit margins...')
  
  const profitMargins = [
    {
      service: 'DATA',
      marginType: 'FIXED',
      marginValue: 100.00,
      isActive: true,
    },
    {
      service: 'AIRTIME',
      marginType: 'PERCENTAGE',
      marginValue: 5.00,
      isActive: true,
    },
    {
      service: 'ELECTRICITY',
      marginType: 'FIXED',
      marginValue: 50.00,
      isActive: true,
    },
    {
      service: 'CABLE',
      marginType: 'FIXED',
      marginValue: 50.00,
      isActive: true,
    },
    {
      service: 'BETTING',
      marginType: 'PERCENTAGE',
      marginValue: 2.00,
      isActive: true,
    },
    {
      service: 'EPINS',
      marginType: 'PERCENTAGE',
      marginValue: 5.00,
      isActive: true,
    },
  ]

  for (const margin of profitMargins) {
    // Check if margin already exists
    const existing = await prisma.profitMargin.findFirst({
      where: {
        service: margin.service,
        vendorName: null,
        network: null,
      },
    })

    if (existing) {
      // Update existing margin
      await prisma.profitMargin.update({
        where: { id: existing.id },
        data: margin,
      })
      console.log(`✅ Updated profit margin for ${margin.service}`)
    } else {
      // Create new margin
      await prisma.profitMargin.create({
        data: {
          ...margin,
          vendorName: null,
          network: null,
        },
      })
      console.log(`✅ Created profit margin for ${margin.service}`)
    }
  }

  // --- SERVICE ROUTING CONFIGURATION ---
  console.log('\n🗺️  Seeding Service Routing...')

  const amigoConfig = await prisma.vendorConfig.findUnique({ where: { adapterId: 'AMIGO' } });
  const vtpassConfig = await prisma.vendorConfig.findUnique({ where: { adapterId: 'VTPASS' } });
  const subandgainConfig = await prisma.vendorConfig.findUnique({ where: { adapterId: 'SUBANDGAIN' } });

  if (amigoConfig && subandgainConfig) {
     // MTN Data -> Amigo (Fallback: SubAndGain)
     await prisma.serviceRouting.upsert({
        where: {
          serviceType_network: {
            serviceType: 'DATA',
            network: 'MTN',
          },
        },
        update: {
          primaryVendorId: amigoConfig.id,
          fallbackVendorId: subandgainConfig.id,
        },
        create: {
          serviceType: 'DATA',
          network: 'MTN',
          primaryVendorId: amigoConfig.id,
          fallbackVendorId: subandgainConfig.id,
        },
     })
     console.log('✅ Service Routing: MTN DATA -> Amigo (Fallback: SubAndGain)')
  }

  if (vtpassConfig && subandgainConfig) {
     // MTN Airtime -> VTPass
     await prisma.serviceRouting.upsert({
        where: {
          serviceType_network: {
            serviceType: 'AIRTIME',
            network: 'MTN',
          },
        },
        update: {
          primaryVendorId: vtpassConfig.id,
          fallbackVendorId: subandgainConfig.id,
        },
        create: {
          serviceType: 'AIRTIME',
          network: 'MTN',
          primaryVendorId: vtpassConfig.id,
          fallbackVendorId: subandgainConfig.id,
        },
     })
     console.log('✅ Service Routing: MTN AIRTIME -> VTPass (Fallback: SubAndGain)')
  }

  if (vtpassConfig) {
      // ELECTRICITY -> VTPass
      await prisma.serviceRouting.upsert({
        where: {
          serviceType_network: {
            serviceType: 'ELECTRICITY',
            network: 'IKEDC', 
          },
        },
        update: {
          primaryVendorId: vtpassConfig.id,
          fallbackVendorId: null,
        },
        create: {
          serviceType: 'ELECTRICITY',
          network: 'IKEDC',
          primaryVendorId: vtpassConfig.id,
          fallbackVendorId: null, 
        },
      })
      console.log('✅ Service Routing: IKEDC ELECTRICITY -> VTPass')
  }

  console.log('✨ Seeding complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
