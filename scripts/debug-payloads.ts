
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import { AmigoAdapter } from '../lib/vendors/amigo.adapter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MOCK_ENV = {
    VTPASS_API_KEY: process.env.VTPASS_API_KEY || 'test-api-key',
    VTPASS_PUBLIC_KEY: process.env.VTPASS_PUBLIC_KEY || 'test-public-key',
    VTPASS_SECRET_KEY: process.env.VTPASS_SECRET_KEY || 'test-secret-key',
    AMIGO_API_TOKEN: process.env.AMIGO_API_TOKEN || 'test-amigo-token',
};

async function main() {
    console.log('--- Debugging Payloads ---');

    // 1. VTPass Debug
    console.log('\n--- VTPass Adapter ---');
    const vtpass = new VTPassAdapter({
        apiKey: MOCK_ENV.VTPASS_API_KEY,
        publicKey: MOCK_ENV.VTPASS_PUBLIC_KEY,
        secretKey: MOCK_ENV.VTPASS_SECRET_KEY,
        useSandbox: false // Set to false to see real endpoints usually, or true if we suspect sandbox issues
    });

    console.log('Fetching VTPass Plans for DATA / MTN...');
    try {
        const plans = await vtpass.getPlans('DATA', 'MTN');
        console.log(`Found ${plans.length} plans.`);
        if (plans.length > 0) {
            console.log('First 3 plans:');
            plans.slice(0, 3).forEach(p => console.log(`- ID: ${p.id}, Name: ${p.name}, Price: ${p.price}`));
        } else {
            console.warn('No plans found! Check serviceID mapping in vtpass.adapter.ts');
        }
    } catch (error: any) {
        console.error('Error fetching VTPass plans:', error.message);
    }

    // 2. Amigo Debug
    console.log('\n--- Amigo Adapter ---');
    const amigo = new AmigoAdapter(MOCK_ENV.AMIGO_API_TOKEN);

    // Access private property or simulate logic to check network mapping
    // We can't access private 'AMIGO_NETWORK_MAP' directly in TS without suppressing usage, 
    // but we can check the behavior by looking at the property if we export it or just copy the logic here to verify.
    // Or we can try to call buyService with a mock payload and see if it fails before the API call if we can mock the network call.
    // But better yet, let's just inspect the mapping logic based on our earlier read.

    const networks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
    const AMIGO_NETWORK_MAP: any = {
        MTN: 1,
        GLO: 2,
        AIRTEL: 4,
        '9MOBILE': 9,
        SMILE: 0,
    };

    console.log('Verifying Amigo Network Maps:');
    for (const net of networks) {
        const mapped = AMIGO_NETWORK_MAP[net];
        console.log(`Network: "${net}" -> Mapped ID: ${mapped} (Type: ${typeof mapped})`);
    }

    // Check strict equality and potential whitespace issues
    const mtnInput = 'MTN';
    console.log(`Check specific 'MTN': AMIGO_NETWORK_MAP['${mtnInput}'] = ${AMIGO_NETWORK_MAP[mtnInput]}`);

    // Check lowercase
    const mtnLower = 'mtn';
    console.log(`Check lowercase 'mtn': AMIGO_NETWORK_MAP['${mtnLower}'] = ${AMIGO_NETWORK_MAP[mtnLower]}`);

    
    // Simulate buyService payload check
    console.log('\nSimulating Amigo buyService payload check...');
    const testPayload = {
        service: 'DATA',
        network: 'MTN',
        phone: '08012345678',
        planId: '101'
    };
    
    // @ts-ignore
    const mappedId = AMIGO_NETWORK_MAP[testPayload.network];
    console.log(`Payload network '${testPayload.network}' maps to: ${mappedId}`);
    
    if (!mappedId || mappedId === 0) {
        console.error('This would throw "Network not supported" error in AmigoAdapter');
    } else {
        console.log('Network mapping seems correct for MTN.');
    }

}

main().catch(console.error);
