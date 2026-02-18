const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
require('dotenv').config()

async function main() {
  console.log('Syncing Environment Variables to Database...')

  // 1. Sync Amigo
  if (process.env.AMIGO_API_KEY) {
    console.log('Found Amigo credentials in .env, updating database...')
    await prisma.vendorConfig.upsert({
      where: { adapterId: 'AMIGO' },
      update: {
        isEnabled: true,
        credentials: {
          apiKey: process.env.AMIGO_API_KEY,
          baseUrl: process.env.AMIGO_BASE_URL || 'https://sub.amigo.ng/api'
        }
      },
      create: {
        vendorName: 'Amigo',
        adapterId: 'AMIGO',
        type: 'DATA',
        isEnabled: true,
        isPrimary: true,
        priority: 1,
        supportsData: true,
        supportsAirtime: false,
        credentials: {
          apiKey: process.env.AMIGO_API_KEY,
          baseUrl: process.env.AMIGO_BASE_URL || 'https://sub.amigo.ng/api'
        }
      }
    })
    console.log('✅ Amigo updated.')
  } else {
    console.log('ℹ️  Amigo credentials not found in .env (AMIGO_API_KEY)')
  }

  // 2. Sync VTPass
  if (process.env.VTPASS_API_KEY && process.env.VTPASS_PUBLIC_KEY && process.env.VTPASS_SECRET_KEY) {
    console.log('Found VTPass credentials in .env, updating database...')
    await prisma.vendorConfig.upsert({
      where: { adapterId: 'VTPASS' },
      update: {
        isEnabled: true,
        credentials: {
          apiKey: process.env.VTPASS_API_KEY,
          publicKey: process.env.VTPASS_PUBLIC_KEY,
          secretKey: process.env.VTPASS_SECRET_KEY
        }
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
        supportsElectricity: true,
        supportsCable: true,
        credentials: {
          apiKey: process.env.VTPASS_API_KEY,
          publicKey: process.env.VTPASS_PUBLIC_KEY,
          secretKey: process.env.VTPASS_SECRET_KEY
        }
      }
    })
    console.log('✅ VTPass updated.')
  } else {
    console.log('ℹ️  VTPass credentials not found in .env (VTPASS_API_KEY, VTPASS_PUBLIC_KEY, VTPASS_SECRET_KEY)')
  }

  // 3. Sync SubAndGain
  if (process.env.SUBANDGAIN_USERNAME && process.env.SUBANDGAIN_API_KEY) {
    console.log('Found SubAndGain credentials in .env, updating database...')
    await prisma.vendorConfig.upsert({
      where: { adapterId: 'SUBANDGAIN' },
      update: {
        isEnabled: true,
        credentials: {
          username: process.env.SUBANDGAIN_USERNAME,
          apiKey: process.env.SUBANDGAIN_API_KEY
        }
      },
      create: {
        vendorName: 'SubAndGain',
        adapterId: 'SUBANDGAIN',
        type: 'DATA',
        isEnabled: true,
        isPrimary: false,
        priority: 2,
        supportsData: true,
        supportsAirtime: true,
        supportsElectricity: true,
        supportsCable: true,
        credentials: {
          username: process.env.SUBANDGAIN_USERNAME,
          apiKey: process.env.SUBANDGAIN_API_KEY
        }
      }
    })
    console.log('✅ SubAndGain updated.')
  } else {
    console.log('ℹ️  SubAndGain credentials not found in .env (SUBANDGAIN_USERNAME, SUBANDGAIN_API_KEY)')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
