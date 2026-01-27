
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
}

async function debug() {
    console.log('--- VTPass Debug Script ---');

    const apiKey = process.env.VTPASS_API_KEY;
    const publicKey = process.env.VTPASS_PUBLIC_KEY;
    const secretKey = process.env.VTPASS_SECRET_KEY;

    console.log('Credentials Status:');
    console.log('API Key:', apiKey ? `Present (Starts with ${apiKey.substring(0, 4)}...)` : 'MISSING');
    console.log('Public Key:', publicKey ? `Present (Starts with ${publicKey.substring(0, 4)}...)` : 'MISSING');
    console.log('Secret Key:', secretKey ? `Present (Starts with ${secretKey.substring(0, 4)}...)` : 'MISSING');

    // Check if we are intentionally falling back to placeholder in the adapter code
    // The adapter code checks: if (!this.apiKey || this.apiKey.includes('placeholder') || this.apiKey.includes('your-'))
    const isPlaceholder = !apiKey || apiKey.includes('placeholder') || apiKey.includes('your-');
    console.log('Is detected as placeholder (simulated mode)?', isPlaceholder);

    if (isPlaceholder) {
        console.warn('WARNING: Credentials appear to be placeholders. Transactions will be SIMULATED and not visible in VTPass sandbox.');
    }

    const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true';
    const adapter = new VTPassAdapter({
        apiKey: apiKey || 'placeholder',
        publicKey: publicKey || 'placeholder',
        secretKey: secretKey || 'placeholder',
        useSandbox
    });

    console.log(`VTPass Adapter Mode: ${useSandbox ? 'SANDBOX' : 'LIVE'}`);

    try {
        console.log('\nAttempting Airtime Purchase (08011111111)...');
        const res = await adapter.buyService({
            service: 'AIRTIME',
            network: 'MTN',
            phone: '08011111111',
            amount: 50,
            idempotencyKey: `debug_${Date.now()}`
        });

        console.log('Purchase Result:', JSON.stringify(res, null, 2));

        if (res.metadata && res.metadata.simulated) {
            console.log('!!! TRANSACTION WAS SIMULATED !!!');
        } else {
            console.log('Transaction appeared to go to VTPass.');
            console.log(`Request ID (Vendor Reference): ${res.vendorReference}`);

            if (res.success) {
                console.log('Transaction Successful. Verify this Request ID in VTPass Sandbox.');
            } else {
                console.log('Transaction Failed.');
            }
        }

    } catch (e: any) {
        console.error('Debug Error:', e);
        if (e.response) {
            console.error('API Response Status:', e.response.status);
            console.error('API Response Data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

debug();
