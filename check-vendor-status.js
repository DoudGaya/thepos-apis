const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // This script helps migrate env vars to the DB if the user wants to
  // But primarily we just want to show the current state
  
  console.log('Checking current vendor configurations...')
  
  const vendors = await prisma.vendorConfig.findMany()
  
  for (const vendor of vendors) {
    console.log(`\nVendor: ${vendor.vendorName} (${vendor.adapterId})`)
    console.log('Enabled:', vendor.isEnabled)
    console.log('Credentials:', JSON.stringify(vendor.credentials, null, 2))
    
    if (vendor.adapterId === 'AMIGO' && vendor.credentials.apiKey === 'placeholder_key') {
      console.warn('⚠️  WARNING: AMIGO is using a placeholder API key. Please update it in the Admin Dashboard.')
    }
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
