import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding vendors...')

  // 1. Amigo (Data Primary)
  const amigo = await prisma.vendorConfig.upsert({
    where: { adapterId: 'AMIGO' },
    update: {
      isEnabled: true,
      supportsData: true,
    },
    create: {
      vendorName: 'Amigo',
      adapterId: 'AMIGO',
      type: 'DATA',
      isEnabled: true,
      isPrimary: true,
      priority: 1,
      supportsData: true,
      supportsAirtime: false, // Amigo is mainly for data in our setup
      credentials: {
        apiKey: process.env.AMIGO_API_KEY || 'placeholder_key',
        baseUrl: process.env.AMIGO_BASE_URL || 'https://sub.amigo.ng/api'
      },
    },
  })
  console.log('Amigo vendor seeded:', amigo.vendorName)

  // 2. VTPass (Airtime Primary)
  const vtpass = await prisma.vendorConfig.upsert({
    where: { adapterId: 'VTPASS' },
    update: {
      isEnabled: true,
      supportsAirtime: true,
      supportsElectric: true,
      supportsCable: true,
    },
    create: {
      vendorName: 'VTPass',
      adapterId: 'VTPASS',
      type: 'AIRTIME',
      isEnabled: true,
      isPrimary: true,
      priority: 1,
      supportsData: true,
      supportsAirtime: true,
      supportsElectric: true,
      supportsCable: true,
      credentials: {
        apiKey: process.env.VTPASS_API_KEY || 'placeholder_key',
        publicKey: process.env.VTPASS_PUBLIC_KEY || 'placeholder_public',
        secretKey: process.env.VTPASS_SECRET_KEY || 'placeholder_secret',
      },
    },
  })
  console.log('VTPass vendor seeded:', vtpass.vendorName)

  // 3. SubAndGain (Backup)
  const subandgain = await prisma.vendorConfig.upsert({
    where: { adapterId: 'SUBANDGAIN' },
    update: {
      isEnabled: true,
    },
    create: {
      vendorName: 'SubAndGain',
      adapterId: 'SUBANDGAIN',
      type: 'DATA', // Can also do airtime
      isEnabled: true,
      isPrimary: false,
      priority: 2,
      supportsData: true,
      supportsAirtime: true,
      supportsElectric: true,
      supportsCable: true,
      credentials: {
        username: process.env.SUBANDGAIN_USERNAME || 'placeholder_user',
        apiKey: process.env.SUBANDGAIN_API_KEY || 'placeholder_key',
      },
    },
  })
  console.log('SubAndGain vendor seeded:', subandgain.vendorName)


  // 4. Service Routing
  
  // MTN Data -> Amigo (Fallback: SubAndGain)
  await prisma.serviceRouting.upsert({
    where: {
      serviceType_network: {
        serviceType: 'DATA',
        network: 'MTN',
      },
    },
    update: {
      primaryVendorId: amigo.id,
      fallbackVendorId: subandgain.id,
    },
    create: {
      serviceType: 'DATA',
      network: 'MTN',
      primaryVendorId: amigo.id,
      fallbackVendorId: subandgain.id,
    },
  })

  // MTN Airtime -> VTPass (Fallback: SubAndGain)
  await prisma.serviceRouting.upsert({
    where: {
      serviceType_network: {
        serviceType: 'AIRTIME',
        network: 'MTN',
      },
    },
    update: {
      primaryVendorId: vtpass.id,
      fallbackVendorId: subandgain.id,
    },
    create: {
      serviceType: 'AIRTIME',
      network: 'MTN',
      primaryVendorId: vtpass.id,
      fallbackVendorId: subandgain.id,
    },
  })

  // ELECTRICITY -> VTPass
  await prisma.serviceRouting.upsert({
    where: {
      serviceType_network: {
        serviceType: 'ELECTRICITY',
        network: 'IKEDC', // Example, normally we would iterate all networks
      },
    },
    update: {
      primaryVendorId: vtpass.id,
      fallbackVendorId: null,
    },
    create: {
      serviceType: 'ELECTRICITY',
      network: 'IKEDC',
      primaryVendorId: vtpass.id,
      fallbackVendorId: null, // SubAndGain supports electricity too if needed
    },
  })

  console.log('Service routing seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
