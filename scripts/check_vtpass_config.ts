import { prisma } from '../lib/prisma';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

async function checkVTPassConfig() {
    console.log('=== Checking VTPass Configuration ===\n');
    
    // 1. Check environment variables
    console.log('1. ENVIRONMENT VARIABLES:');
    console.log('   VTPASS_API_KEY:', process.env.VTPASS_API_KEY?.substring(0, 15) + '...');
    console.log('   VTPASS_PUBLIC_KEY:', process.env.VTPASS_PUBLIC_KEY?.substring(0, 15) + '...');
    console.log('   VTPASS_SECRET_KEY:', process.env.VTPASS_SECRET_KEY?.substring(0, 15) + '...');
    console.log('   VTPASS_USE_SANDBOX:', `"${process.env.VTPASS_USE_SANDBOX}"`);
    console.log('   Is sandbox?:', process.env.VTPASS_USE_SANDBOX === 'true' ? 'YES (SANDBOX)' : 'NO (LIVE)');
    console.log('');

    // 2. Check database config
    console.log('2. DATABASE VENDOR CONFIG:');
    try {
        const vtpassConfig = await prisma.vendorConfig.findUnique({
            where: { adapterId: 'VTPASS' }
        });

        if (vtpassConfig) {
            console.log('   Vendor Name:', vtpassConfig.vendorName);
            console.log('   Adapter ID:', vtpassConfig.adapterId);
            console.log('   Is Enabled:', vtpassConfig.isEnabled);
            console.log('   Balance in DB:', vtpassConfig.balance);
            console.log('   Credentials in DB:');
            const creds = vtpassConfig.credentials as any;
            if (creds) {
                console.log('     - apiKey:', creds.apiKey?.substring(0, 15) + '...');
                console.log('     - publicKey:', creds.publicKey?.substring(0, 15) + '...');
                console.log('     - secretKey:', creds.secretKey?.substring(0, 15) + '...');
                console.log('     - useSandbox:', creds.useSandbox);
            }
        } else {
            console.log('   ❌ No VTPass config found in database!');
        }
    } catch (error) {
        console.error('   Error querying database:', error);
    }
    console.log('');

    // 3. Show what will be used
    console.log('3. FINAL CREDENTIALS (merged):');
    const dbConfig = await prisma.vendorConfig.findUnique({
        where: { adapterId: 'VTPASS' }
    });
    const dbCreds = dbConfig?.credentials as any;
    
    const finalCreds = {
        apiKey: process.env.VTPASS_API_KEY || dbCreds?.apiKey,
        publicKey: process.env.VTPASS_PUBLIC_KEY || dbCreds?.publicKey,
        secretKey: process.env.VTPASS_SECRET_KEY || dbCreds?.secretKey,
        useSandbox: process.env.VTPASS_USE_SANDBOX === 'true'
    };

    console.log('   API Key:', finalCreds.apiKey?.substring(0, 15) + '...');
    console.log('   Public Key:', finalCreds.publicKey?.substring(0, 15) + '...');
    console.log('   Secret Key:', finalCreds.secretKey?.substring(0, 15) + '...');
    console.log('   Use Sandbox:', finalCreds.useSandbox);
    console.log('   Mode:', finalCreds.useSandbox ? '🔴 SANDBOX' : '🟢 LIVE');
    console.log('');

    // 4. Show which API URL will be used
    console.log('4. API ENDPOINT:');
    const apiUrl = finalCreds.useSandbox 
        ? 'https://sandbox.vtpass.com/api'
        : 'https://vtpass.com/api';
    console.log('   ', apiUrl);
    console.log('');

    await prisma.$disconnect();
}

checkVTPassConfig().catch(console.error);
