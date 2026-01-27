
import { VTPassAdapter } from '../lib/vendors/vtpass.adapter';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpAllServices() {
    const adapter = new VTPassAdapter({
        apiKey: process.env.VTPASS_API_KEY!,
        publicKey: process.env.VTPASS_PUBLIC_KEY!,
        secretKey: process.env.VTPASS_SECRET_KEY!,
        useSandbox: process.env.VTPASS_USE_SANDBOX === 'true'
    });

    try {
        const categories = await adapter.getServiceCategories();
        for (const cat of categories) {
            console.log(`\nCATEGORY: ${cat.name} (${cat.identifier})`);
            const services = await adapter.getServices(cat.identifier);
            for (const s of services) {
                console.log(`- ${s.name}: ${s.serviceID}`);
            }
        }
    } catch (e: any) {
        console.error(e.message);
    }
}

dumpAllServices();
