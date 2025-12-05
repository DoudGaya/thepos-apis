const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Switching VTPass to LIVE mode...\n')

  try {
    const config = await prisma.vendorConfig.findUnique({
      where: { adapterId: 'VTPASS' }
    })

    if (!config) {
      console.error('❌ VTPass config not found!')
      return
    }

    const newCredentials = {
      ...config.credentials,
      useSandbox: false
    }

    await prisma.vendorConfig.update({
      where: { adapterId: 'VTPASS' },
      data: {
        credentials: newCredentials
      }
    })

    console.log('✅ VTPass switched to LIVE mode.')
    console.log('⚠️  Make sure your .env file has VTPASS_USE_SANDBOX=false to prevent overwriting this in the future.')
  } catch (error) {
    console.error('❌ Error updating VTPass:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
