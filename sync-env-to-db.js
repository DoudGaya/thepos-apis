const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
require('dotenv').config()

async function main() {
  console.log('Syncing Environment Variables to Database...')

  // 1. Sync VTU.NG
  if (process.env.VTU_NG_USERNAME && process.env.VTU_NG_PASSWORD) {
    console.log('Found VTU.NG credentials in .env, updating database...')
    await prisma.vendorConfig.update({
      where: { adapterId: 'VTU_NG' },
      data: {
        credentials: {
          username: process.env.VTU_NG_USERNAME,
          password: process.env.VTU_NG_PASSWORD
        }
      }
    })
    console.log('✅ VTU.NG updated.')
  } else {
    console.log('ℹ️  VTU.NG credentials not found in .env (VTU_NG_USERNAME, VTU_NG_PASSWORD)')
  }

  // 2. Sync Amigo
  if (process.env.AMIGO_API_KEY) {
    console.log('Found Amigo credentials in .env, updating database...')
    await prisma.vendorConfig.update({
      where: { adapterId: 'AMIGO' },
      data: {
        credentials: {
          apiKey: process.env.AMIGO_API_KEY
        }
      }
    })
    console.log('✅ Amigo updated.')
  } else {
    console.log('ℹ️  Amigo credentials not found in .env (AMIGO_API_KEY)')
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
