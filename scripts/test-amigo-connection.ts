import { AmigoAdapter } from '../lib/vendors/amigo.adapter'
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
    const apiToken = process.env.AMIGO_API_TOKEN
    if (!apiToken) {
        console.error('AMIGO_API_TOKEN not found in .env')
        return
    }

    const amigo = new AmigoAdapter(apiToken)

    try {
        console.log('Fetching plans to test connection...')
        const plans = await amigo.getPlans('DATA', 'MTN')
        console.log(`Success! Found ${plans.length} MTN plans.`)
        if (plans.length > 0) {
            console.log('Sample plan:', plans[0])
            
            // Test purchase payload construction log
            console.log('\nTesting purchase payload construction (this will fail but should log the payload):')
            try {
                // Mock purchase to see the payload log from inside buyService
                // Using a fake plan ID but valid-looking phone
                await amigo.buyService({
                    service: 'DATA',
                    network: 'MTN',
                    planId: '5000', 
                    phone: '08031234567',
                    amount: 299,
                    idempotencyKey: 'test-' + Date.now()
                })
            } catch (e: any) {
                console.log('Expected error during purchase test:', e.message)
            }
        }
    } catch (e: any) {
        console.error('Connection failed:', e.message)
        if (e.details) {
             console.error('Vendor Error Details:', JSON.stringify(e.details, null, 2))
        }
        if (e.response) {
            console.error('Raw Response Data:', JSON.stringify(e.response.data, null, 2))
            console.error('Raw Response Status:', e.response.status)
        }
    }
}

main()
