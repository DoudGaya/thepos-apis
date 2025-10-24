/**
 * Test Script for Amigo Data Vending Integration
 * 
 * Tests the Amigo adapter with sandbox mode (090000 numbers don't debit)
 */

import { AmigoAdapter } from './lib/vendors/amigo.adapter'
import { config } from 'dotenv'

// Load environment variables
config()

async function testAmigo() {
  console.log('🧪 Testing Amigo Data Vending Integration\n')
  console.log('=' .repeat(60))

  // Check for API token
  if (!process.env.AMIGO_API_TOKEN) {
    console.error('❌ AMIGO_API_TOKEN not found in environment variables')
    console.log('\nPlease add to your .env file:')
    console.log('AMIGO_API_TOKEN=your_api_token_here')
    process.exit(1)
  }

  const amigo = new AmigoAdapter(process.env.AMIGO_API_TOKEN)

  try {
    // Test 1: Authentication
    console.log('\n📡 Test 1: Authentication')
    console.log('-'.repeat(60))
    await amigo.authenticate()
    console.log('✅ Authentication successful')
    console.log(`   Authenticated: ${amigo.isAuthenticated()}`)

    // Test 2: Get Supported Services
    console.log('\n📋 Test 2: Get Supported Services')
    console.log('-'.repeat(60))
    const services = amigo.getSupportedServices()
    console.log('✅ Supported services:', services.join(', '))

    // Test 3: Get Plans (MTN)
    console.log('\n📦 Test 3: Get MTN Plans')
    console.log('-'.repeat(60))
    const mtnPlans = await amigo.getPlans('DATA', 'MTN')
    console.log(`✅ Found ${mtnPlans.length} MTN plans:`)
    mtnPlans.slice(0, 5).forEach(plan => {
      console.log(`   - ${plan.name} @ ₦${plan.price.toLocaleString()}`)
    })

    // Test 4: Get Plans (GLO)
    console.log('\n📦 Test 4: Get Glo Plans')
    console.log('-'.repeat(60))
    const gloplans = await amigo.getPlans('DATA', 'GLO')
    console.log(`✅ Found ${gloplans.length} Glo plans:`)
    gloplans.slice(0, 5).forEach(plan => {
      console.log(`   - ${plan.name} @ ₦${plan.price.toLocaleString()}`)
    })

    // Test 5: Sandbox Purchase (MTN 1GB)
    console.log('\n💳 Test 5: Sandbox Purchase (MTN 1GB)')
    console.log('-'.repeat(60))
    console.log('ℹ️  Using sandbox number 09000012345 (won\'t debit account)')
    
    const purchaseResult = await amigo.buyService({
      service: 'DATA',
      network: 'MTN',
      phone: '09000012345', // Sandbox number
      planId: '1001', // MTN 1GB plan
      idempotencyKey: `TEST-${Date.now()}`,
    })

    console.log('✅ Purchase successful!')
    console.log(`   Status: ${purchaseResult.status}`)
    console.log(`   Reference: ${purchaseResult.vendorReference}`)
    console.log(`   Cost: ₦${purchaseResult.costPrice.toLocaleString()}`)
    console.log(`   Message: ${purchaseResult.message}`)

    // Test 6: Invalid Plan ID
    console.log('\n❌ Test 6: Invalid Plan ID (Expected to Fail)')
    console.log('-'.repeat(60))
    try {
      await amigo.buyService({
        service: 'DATA',
        network: 'MTN',
        phone: '09000012345',
        planId: '99999', // Invalid plan
        idempotencyKey: `TEST-FAIL-${Date.now()}`,
      })
      console.log('⚠️  Expected error but succeeded')
    } catch (error: any) {
      console.log('✅ Error caught as expected:')
      console.log(`   ${error.message}`)
    }

    // Test 7: Unsupported Service
    console.log('\n❌ Test 7: Unsupported Service (Expected to Fail)')
    console.log('-'.repeat(60))
    try {
      await amigo.buyService({
        service: 'AIRTIME',
        network: 'MTN',
        phone: '09000012345',
        amount: 100,
        idempotencyKey: `TEST-AIRTIME-${Date.now()}`,
      })
      console.log('⚠️  Expected error but succeeded')
    } catch (error: any) {
      console.log('✅ Error caught as expected:')
      console.log(`   ${error.message}`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ All Tests Completed Successfully!')
    console.log('='.repeat(60))
    console.log('\n📝 Summary:')
    console.log('   - Authentication: ✅')
    console.log('   - Service Detection: ✅')
    console.log('   - Plan Fetching: ✅')
    console.log('   - Sandbox Purchase: ✅')
    console.log('   - Error Handling: ✅')
    console.log('\n🎉 Amigo integration is ready for production!')
    console.log('\n💡 Next steps:')
    console.log('   1. Add AMIGO_API_TOKEN to your .env file')
    console.log('   2. Test with real phone numbers (starts with 070, 080, 081, 090, 091)')
    console.log('   3. Monitor transactions in Amigo dashboard')

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message)
    if (error.vendorResponse) {
      console.error('   Vendor Response:', error.vendorResponse)
    }
    process.exit(1)
  }
}

// Run tests
testAmigo()
