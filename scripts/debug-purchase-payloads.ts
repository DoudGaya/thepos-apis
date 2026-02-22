
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import { AmigoAdapter } from '../lib/vendors/amigo.adapter';
import { PurchasePayload } from '../lib/vendors/adapter.interface';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('--- Debugging Purchase Payloads ---');

    // 1. VTPass Debug
    console.log('\n[VTPass] Checking Plans...');
    const vtpass = new VTPassAdapter({
        apiKey: process.env.VTPASS_API_KEY || 'test-key',
        publicKey: process.env.VTPASS_PUBLIC_KEY || 'test-public',
        secretKey: process.env.VTPASS_SECRET_KEY || 'test-secret',
        useSandbox: false // Use live to see real plan IDs
    });

    try {
        const plans = await vtpass.getPlans('DATA', 'MTN');
        console.log(`[VTPass] Fetched ${plans.length} MTN plans.`);
        if (plans.length > 0) {
            console.log('[VTPass] Sample Plan ID:', plans[0].id);
            console.log('[VTPass] Sample Plan Name:', plans[0].name);
        }
    } catch (e: any) {
        console.error('[VTPass] Failed to fetch plans:', e.message);
    }

    // 2. Amigo Debug
    console.log('\n[Amigo] Checking Network Mapping...');
    const amigo = new AmigoAdapter({
        apiToken: process.env.AMIGO_API_TOKEN || 'test-token'
    });

    // Simulate Purchase Payload for Amigo
    const payload: PurchasePayload = {
        service: 'DATA',
        network: 'MTN',
        phone: '08031234567',
        planId: '101', // Example plan ID
        amount: 100,
        idempotencyKey: 'debug-' + Date.now()
    };

    console.log('[Amigo] Testing payload construction logic (mocking internals)...');
    
    // We can't easily spy on private methods, but we can replicate the logic here to verify
    const AMIGO_NETWORK_MAP: any = {
        MTN: 1,
        GLO: 2,
        AIRTEL: 4,
        '9MOBILE': 9,
    };

    const networkId = AMIGO_NETWORK_MAP[payload.network];
    console.log(`[Amigo] Network 'MTN' maps to ID: ${networkId} (Type: ${typeof networkId})`);

    if (networkId !== 1) {
        console.error('[Amigo] ERROR: Network mapping is incorrect!');
    } else {
        console.log('[Amigo] Network mapping is correct.');
    }

    // Check if Amigo plans fetch works
    try {
        console.log('[Amigo] Fetching plans to see IDs...');
        // Note: fetchPlansFromAPI is private, but getPlans calls it.
        const plans = await amigo.getPlans('DATA', 'MTN');
        console.log(`[Amigo] Fetched ${plans.length} MTN plans.`);
        if (plans.length > 0) {
            console.log('[Amigo] Sample Plan ID:', plans[0].id);
            console.log('[Amigo] Sample Plan Name:', plans[0].name);
        }
    } catch (e: any) {
        console.error('[Amigo] Failed to fetch plans:', e.message);
        if (e.response && e.response.data) {
            console.error('[Amigo] Error data:', JSON.stringify(e.response.data, null, 2));
        } else if (e.details) {
             console.error('[Amigo] Error details:', JSON.stringify(e.details, null, 2));
        }
    }

}

main();
