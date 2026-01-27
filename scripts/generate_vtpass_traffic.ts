
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('--- VTPass Sandbox Traffic Generator ---');

    const apiKey = process.env.VTPASS_API_KEY;
    const publicKey = process.env.VTPASS_PUBLIC_KEY;
    const secretKey = process.env.VTPASS_SECRET_KEY;

    if (!apiKey || !publicKey || !secretKey) {
        console.error('ERROR: Missing VTPass credentials in .env file.');
        console.error('Please ensure VTPASS_API_KEY, VTPASS_PUBLIC_KEY, and VTPASS_SECRET_KEY are set.');
        process.exit(1);
    }

    const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true';
    const adapter = new VTPassAdapter({
        apiKey,
        publicKey,
        secretKey,
        useSandbox
    });

    console.log(`Initialized VTPass Adapter in ${useSandbox ? 'SANDBOX' : 'LIVE'} mode.`);

    try {
        // 1. Check Balance
        console.log('\n--- 1. Checking Balance ---');
        const balance = await adapter.getBalance();
        console.log('Balance:', balance);

        // 2. Airtime Purchase (Success)
        console.log('\n--- 2. Airtime Purchase (MTN Success Scenario) ---');
        const airtimeRes = await adapter.buyService({
            service: 'AIRTIME',
            network: 'MTN',
            phone: '08011111111', // Sandbox success number
            amount: 100,
            idempotencyKey: `txn_${Date.now()}_airtime`
        });
        console.log('Airtime Response:', airtimeRes);
        if (airtimeRes.vendorReference) {
            console.log(`>>> Airtime Request ID: ${airtimeRes.vendorReference}`);
        }

        // 3. Data Purchase (Success)
        console.log('\n--- 3. Data Purchase (MTN Success Scenario) ---');
        // Need a valid plan ID. The adapter docs or code might help, but for sandbox sometimes any string works or we need to fetch plans first.
        // Let's fetch plans first to be safe.
        const plans = await adapter.getPlans('DATA', 'MTN');
        const planId = plans.length > 0 ? plans[0].id : 'mtn-100mb-daily'; // Fallback

        const dataRes = await adapter.buyService({
            service: 'DATA',
            network: 'MTN',
            phone: '08011111111',
            amount: 100, // Often ignored for data plans but good to have
            planId: planId,
            idempotencyKey: `txn_${Date.now()}_data`
        });
        console.log('Data Response:', dataRes);
        if (dataRes.vendorReference) {
            console.log(`>>> Data Request ID: ${dataRes.vendorReference}`);
        }

        console.log('\n--- Traffic Generation Complete ---');
        console.log('Please check your VTPass Sandbox Console for these transactions.');

        const fs = require('fs');
        let output = `VTPass Sandbox Request IDs:\n`;
        if (airtimeRes.vendorReference) output += `Airtime Request ID: ${airtimeRes.vendorReference}\n`;
        if (dataRes.vendorReference) output += `Data Request ID: ${dataRes.vendorReference}\n`;

        fs.writeFileSync('vtpass_request_ids.txt', output);
        console.log('Request IDs written to vtpass_request_ids.txt');

    } catch (error: any) {
        console.error('An error occurred:', error.message);
        if (error.response?.data) {
            console.error('Vendor Response:', error.response.data);
        }
    }
}

main();
