import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

async function testVTPassLive() {
    console.log('=== VTPass Live Test ===\n');
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('VTPASS_API_KEY:', process.env.VTPASS_API_KEY?.substring(0, 10) + '...');
    console.log('VTPASS_PUBLIC_KEY:', process.env.VTPASS_PUBLIC_KEY?.substring(0, 10) + '...');
    console.log('VTPASS_SECRET_KEY:', process.env.VTPASS_SECRET_KEY?.substring(0, 10) + '...');
    console.log('VTPASS_USE_SANDBOX:', `"${process.env.VTPASS_USE_SANDBOX}"`);
    console.log('VTPASS_USE_SANDBOX === "true":', process.env.VTPASS_USE_SANDBOX === 'true');
    console.log('');

    const useSandbox = process.env.VTPASS_USE_SANDBOX === 'true';
    
    const adapter = new VTPassAdapter({
        apiKey: process.env.VTPASS_API_KEY!,
        publicKey: process.env.VTPASS_PUBLIC_KEY!,
        secretKey: process.env.VTPASS_SECRET_KEY!,
        useSandbox
    });

    console.log(`Adapter Mode: ${useSandbox ? 'SANDBOX' : 'LIVE'}`);
    console.log('');

    try {
        console.log('Fetching balance...');
        const balance = await adapter.getBalance();
        console.log('Balance:', balance);
        console.log('');
        console.log(`✅ Successfully fetched ${useSandbox ? 'SANDBOX' : 'LIVE'} balance: ₦${balance.balance}`);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response?.data) {
            console.error('Response:', error.response.data);
        }
    }
}

testVTPassLive();
