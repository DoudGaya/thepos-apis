
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up VTU.ng and ClubKonnect vendors...')

  const vendorsToRemove = ['VTU_NG', 'CLUBKONNECT']

  const vendors = await prisma.vendorConfig.findMany({
    where: {
      adapterId: {
        in: vendorsToRemove,
      },
    },
  })

  if (vendors.length === 0) {
    console.log('No vendors found to remove.')
    return
  }

  const vendorIds = vendors.map((v) => v.id)
  console.log(`Found ${vendorIds.length} vendors to remove:`, vendors.map(v => v.adapterId).join(', '))

  // 1. Delete associated DataPlans
  const deletedDataPlans = await prisma.dataPlan.deleteMany({
    where: {
      vendorId: {
        in: vendorIds,
      },
    },
  })
  console.log(`Deleted ${deletedDataPlans.count} data plans associated with removed vendors.`)

  // 2. Delete/Update ServiceRoutings
  // Option A: Delete them. Seed script will recreate necessary ones.
  const deletedPrimaryRoutings = await prisma.serviceRouting.deleteMany({
    where: {
      primaryVendorId: {
        in: vendorIds,
      },
    },
  })
  console.log(`Deleted ${deletedPrimaryRoutings.count} service routings where removed vendor was primary.`)

  // Check fallbacks - Update to NULL instead of delete whole routing (unless primary is also gone, which is handled above)
  /*
  The deleteMany above handles cases where they are primary. 
  But what if they are fallback? 
  We should update those to remove the fallback.
  */
  const updatedFallbackRoutings = await prisma.serviceRouting.updateMany({
    where: {
      fallbackVendorId: {
        in: vendorIds,
      },
      // Ensure we don't try to update already deleted records (though previous deleteMany should handle that)
      // actually updateMany doesn't check previous deleteMany in same transaction unless interactive, 
      // but here we are sequential await.
    },
    data: {
      fallbackVendorId: null,
    },
  })
  console.log(`Updated ${updatedFallbackRoutings.count} service routings to remove fallback reference.`)


  // 3. Delete VendorConfigs
  const deletedVendors = await prisma.vendorConfig.deleteMany({
    where: {
      id: {
        in: vendorIds,
      },
    },
  })
  console.log(`Deleted ${deletedVendors.count} vendor configurations.`)

  console.log('Cleanup complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
