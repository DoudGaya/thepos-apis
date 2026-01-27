
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listServices() {
    console.log('--- Listing VTpass Available Services ---');

    const adapter = new VTPassAdapter({
        apiKey: process.env.VTPASS_API_KEY!,
        publicKey: process.env.VTPASS_PUBLIC_KEY!,
        secretKey: process.env.VTPASS_SECRET_KEY!,
        useSandbox: process.env.VTPASS_USE_SANDBOX === 'true'
    });

    try {
        console.log('\n--- 1. Account Balance ---');
        const balance = await adapter.getBalance();
        console.log('Balance:', balance);

        console.log('\n--- 2. Service Categories ---');
        const categories = await adapter.getServiceCategories();
        console.log('Categories:', JSON.stringify(categories, null, 2));

        const interestingCategories = [
            'airtime',
            'data',
            'tv-subscription',
            'electricity-bill',
            'education',
            'other-services'
        ];

        for (const cat of interestingCategories) {
            console.log(`\n--- Services for: ${cat} ---`);
            const services = await adapter.getServices(cat);
            if (services.length > 0) {
                console.log(`All services for ${cat}:`, JSON.stringify(services, null, 2));
            } else {
                console.log(`No services found for ${cat}`);
            }
        }

    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.response?.data) {
            console.error('Vendor Details:', error.response.data);
        }
    }
}

listServices();
