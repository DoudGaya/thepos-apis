import { vendorService } from '@/lib/vendors'

async function main() {
  console.log('🚀 Starting Plan Sync for VTPASS...')
  try {
    const results = await vendorService.syncPlans('VTPASS')
    console.log(`✅ Sync successful!`)
    console.log(`Updated/Created: ${results.count} plans`)
    if (results.errors && results.errors.length > 0) {
        console.warn('⚠️ Some errors occurred:', results.errors)
    }
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

main()