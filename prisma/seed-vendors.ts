import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding vendors...')

  // 1. Amigo (Data Primary)
  const amigo = await prisma.vendorConfig.upsert({
    where: { adapterId: 'AMIGO' },
    update: {},
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
        baseUrl: 'https://amigo.example.com/api', // Replace with actual if known or keep generic
      },
    },
  })
  console.log('Amigo vendor seeded:', amigo.vendorName)

  // 2. VTU.ng (Airtime Primary)
  const vtung = await prisma.vendorConfig.upsert({
    where: { adapterId: 'VTU_NG' },
    update: {},
    create: {
      vendorName: 'VTU.ng',
      adapterId: 'VTU_NG',
      type: 'AIRTIME',
      isEnabled: true,
      isPrimary: true,
      priority: 1,
      supportsData: true,
      supportsAirtime: true,
      credentials: {
        username: process.env.VTU_NG_USERNAME || 'placeholder_user',
        password: process.env.VTU_NG_PASSWORD || 'placeholder_pass',
        baseUrl: 'https://vtu.ng/wp-json/api/v1',
      },
    },
  })
  console.log('VTU.ng vendor seeded:', vtung.vendorName)

  // 3. Service Routing
  // MTN Data -> Amigo
  await prisma.serviceRouting.upsert({
    where: {
      serviceType_network: {
        serviceType: 'DATA',
        network: 'MTN',
      },
    },
    update: {},
    create: {
      serviceType: 'DATA',
      network: 'MTN',
      primaryVendorId: amigo.id,
      fallbackVendorId: vtung.id,
    },
  })

  // MTN Airtime -> VTU.ng
  await prisma.serviceRouting.upsert({
    where: {
      serviceType_network: {
        serviceType: 'AIRTIME',
        network: 'MTN',
      },
    },
    update: {},
    create: {
      serviceType: 'AIRTIME',
      network: 'MTN',
      primaryVendorId: vtung.id,
      fallbackVendorId: null,
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
