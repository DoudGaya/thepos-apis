
import * as fs from 'fs';
import * as path from 'path';

console.log('--- Checking Environment Variables for OPay ---');

const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

function checkFile(filePath: string, name: string) {
    if (fs.existsSync(filePath)) {
        console.log(`\n📄 Checking ${name}...`);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for OPAY_MERCHANT_ID
        const merchantMatch = content.match(/^OPAY_MERCHANT_ID=(.*)$/m);
        if (merchantMatch) {
            console.log(`   OPAY_MERCHANT_ID: "${merchantMatch[1].trim()}"`);
        } else {
            console.log(`   OPAY_MERCHANT_ID: (Not found in this file)`);
        }

        // Check for Keys (masked)
        const pubKeyMatch = content.match(/^OPAY_PUBLIC_KEY=(.*)$/m);
        if (pubKeyMatch) {
            console.log(`   OPAY_PUBLIC_KEY:  Found (Starts with ${pubKeyMatch[1].trim().substring(0, 10)}...)`);
        }

        const secKeyMatch = content.match(/^OPAY_SECRET_KEY=(.*)$/m);
        if (secKeyMatch) {
            console.log(`   OPAY_SECRET_KEY:  Found (Starts with ${secKeyMatch[1].trim().substring(0, 10)}...)`);
        }

    } else {
        console.log(`\n❌ ${name} does not exist.`);
    }
}

checkFile(envPath, '.env');
checkFile(envLocalPath, '.env.local');

console.log('\n--- Variable Naming Check ---');
// We just want to check the file content really, but let's see what the service would load if we ran it.
// Actually, running the service might fail if DB not connected. Let's just trust the file check for now.
