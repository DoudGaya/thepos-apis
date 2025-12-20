
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://sandboxapi.opaycheckout.com';

// Credentials from .env (Observed in logs)
const ENV_CREDENTIALS = {
    publicKey: process.env.OPAY_PUBLIC_KEY,
    secretKey: process.env.OPAY_SECRET_KEY,
    merchantId: process.env.OPAY_MERCHANT_ID
};

// Credentials from test-opay-init.ts
const TEST_FILE_CREDENTIALS = {
    publicKey: 'OPAYPUB17512103236410.10209526862698393',
    secretKey: 'OPAYPRV17512103236410.4373670536079737',
    merchantId: '256625062910394'
};

async function testCredentials(name: string, creds: any) {
    console.log(`\n--- Testing ${name} ---`);
    console.log('Merchant ID:', creds.merchantId);
    console.log('Public Key:', creds.publicKey);

    if (!creds.publicKey || !creds.secretKey || !creds.merchantId) {
        console.log('❌ Missing credentials');
        return;
    }

    const payload = {
        merchantId: creds.merchantId,
        reference: `TEST_VERIFY_${Date.now()}`,
        amount: { total: 10000, currency: 'NGN' },
        country: 'NG',
        product: { name: 'Verification', description: 'Test' },
        callbackUrl: 'http://localhost:3000',
        returnUrl: 'http://localhost:3000',
        payMethod: 'BankCard',
        expireAt: 30,
        userInfo: { userId: '1', userEmail: 'test@email.com' }
    };

    const stringToSign = JSON.stringify(payload);
    const hash = crypto.createHmac('sha512', creds.secretKey).update(stringToSign).digest('hex');

    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/international/cashier/create`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${hash}`,
                    'MerchantId': creds.merchantId
                }
            }
        );

        if (response.data.code === '00000') {
            console.log('✅ SUCCESS! These credentials work.');
            return true;
        } else {
            console.log(`❌ Failed: [${response.data.code}] ${response.data.message}`);
            return false;
        }
    } catch (error: any) {
        console.log(`❌ Network Error/Auth Error: ${error.response?.data?.message || error.message}`);
        if (error.response?.data) console.log(JSON.stringify(error.response.data));
        return false;
    }
}

async function run() {
    console.log("🔍 Starting Credential Verification...");

    // 1. Test Env Credentials
    await testCredentials('ENV Credentials', ENV_CREDENTIALS);

    // 2. Test Test-File Credentials
    await testCredentials('Test File Credentials', TEST_FILE_CREDENTIALS);

    // 3. Test Mix: Env Keys + Test File Merchant ID (Common mismatch)
    await testCredentials('Mix: Env Keys + Test File MerchantID', {
        ...ENV_CREDENTIALS,
        merchantId: TEST_FILE_CREDENTIALS.merchantId
    });

    // 4. Test Mix: Test File Keys + Env Merchant ID
    await testCredentials('Mix: Test File Keys + Env MerchantID', {
        ...TEST_FILE_CREDENTIALS,
        merchantId: ENV_CREDENTIALS.merchantId
    });
}

run();
