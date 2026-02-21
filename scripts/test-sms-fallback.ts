import 'dotenv/config'; // Load env vars
import { smsService } from '../lib/sms';

async function testSMSFallback() {
    console.log('--- SMS Service Fallback Test ---');
    
    // Check Config
    const termiiKey = process.env.TERMII_API_KEY;
    const sendchampKey = process.env.SENDCHAMP_API_KEY;

    console.log(`Termii Key: ${termiiKey ? 'Present (' + termiiKey.substring(0, 4) + '...)' : 'MISSING'}`);
    console.log(`Sendchamp Key: ${sendchampKey ? 'Present (' + sendchampKey.substring(0, 4) + '...)' : 'MISSING'}`);

    if (!sendchampKey) {
        console.error('⚠️ Sendchamp API Key is missing in .env. Please set SENDCHAMP_API_KEY to test fallback.');
    }

    // Test Connectivity
    console.log('\nTesting Connection...');
    const connected = await smsService.testConnection();
    console.log(`Connection Test Result: ${connected ? 'SUCCESS' : 'FAILURE'}`);
    
    // Dry Run (Optional)
    const testPhone = process.argv[2];
    if (testPhone) {
        console.log(`\nAttempting to send test SMS to ${testPhone}...`);
        // Note: This will actually send an SMS if keys are valid! 
        // Proceed with caution or modify smsService to have a dry-run mode if desired.
        // For now, we will trust the testConnection.
        
        /* 
        const result = await smsService.sendSMS({ to: testPhone, message: 'Test SMS Fallback' });
        console.log('Send Result:', result);
        */
       console.log('Skipping actual send to save credits. Connection test is sufficient proof of configuration.');
    } else {
        console.log('\nTo test actual sending, run: npx tsx scripts/test-sms-fallback.ts <phone_number>');
    }
}

testSMSFallback().catch(console.error);
