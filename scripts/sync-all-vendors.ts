
import { vendorService } from '@/lib/vendors'
import { prisma } from '@/lib/prisma'

async function syncAll() {
  console.log('🚀 Starting Data Plan Sync for All Vendors...')

  // Sync VTU_NG
  try {
    console.log('\n📡 Syncing VTU_NG...')
    const vtung = await vendorService.syncPlans('VTU_NG')
    console.log(`✅ VTU_NG complete: ${vtung.count} plans updated/created.`)
  } catch (err: any) {
    console.error('❌ VTU_NG Failed:', err.message)
  }

  // Sync AMIGO
  try {
    console.log('\n📡 Syncing AMIGO...')
    const amigo = await vendorService.syncPlans('AMIGO')
    console.log(`✅ AMIGO complete: ${amigo.count} plans updated/created.`)
  } catch (err: any) {
    console.error('❌ AMIGO Failed:', err.message)
  }

  // Attempt ClubKonnect (May fail if no creds, but good to try)
  // Commented out to avoid noise if not set up, but available structure:
  /*
  try {
    console.log('\n📡 Syncing CLUBKONNECT...')
    const ck = await vendorService.syncPlans('CLUBKONNECT')
    console.log(`✅ CLUBKONNECT complete: ${ck.count} plans updated/created.`)
  } catch (err: any) {
    console.log('ℹ️ CLUBKONNECT Skipped:', err.message)
  }
  */

  console.log('\n🏁 All sync operations finished.')
}

syncAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
