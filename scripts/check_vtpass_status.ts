
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

async function checkIds() {
    console.log('--- VTPass Status Check ---');

    const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true';
    const adapter = new VTPassAdapter({
        apiKey: process.env.VTPASS_API_KEY || 'placeholder',
        publicKey: process.env.VTPASS_PUBLIC_KEY || 'placeholder',
        secretKey: process.env.VTPASS_SECRET_KEY || 'placeholder',
        useSandbox
    });

    console.log(`VTPass Mode: ${useSandbox ? 'SANDBOX' : 'LIVE'}`);

    const ids = [
        '202601121113lpk5l42b', // Airtime
        '202601121113pckvwf4k'  // Data
    ];

    for (const id of ids) {
        console.log(`\nChecking ID: ${id}`);
        try {
            const res = await adapter.checkStatus(id);
            console.log('Result:', JSON.stringify(res, null, 2));
        } catch (e: any) {
            console.error(`Error checking ${id}:`, e.message);
        }
    }
}

checkIds();
