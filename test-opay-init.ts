
import axios from 'axios';
import crypto from 'crypto';

const OPAY_PUBLIC_KEY = 'OPAYPUB17512103236410.10209526862698393';
const OPAY_SECRET_KEY = 'OPAYPRV17512103236410.4373670536079737';
const OPAY_MERCHANT_ID = '256625062910394';
const OPAY_BASE_URL = 'https://sandboxapi.opaycheckout.com';

interface TestConfig {
    name: string;
    endpoint: string;
    payloadModifier: (p: any) => any;
    headerModifier: (h: any, hash: string) => any;
}

const configs: TestConfig[] = [
    // 1. Standard /payment/create with merchantId via Header ONLY (Variation 6 retry)
    {
        name: 'Standard Payment - Header Only MerchantId',
        endpoint: '/api/v1/international/payment/create',
        payloadModifier: (p) => {
            const { merchantId, ...rest } = p;
            return rest;
        },
        headerModifier: (h, hash) => ({ ...h, 'Authorization': `Bearer ${hash}`, 'MerchantId': OPAY_MERCHANT_ID })
    },
    // 2. Standard Payment - MerchantID (caps)
    {
        name: 'Standard Payment - MerchantID (caps)',
        endpoint: '/api/v1/international/payment/create',
        payloadModifier: (p) => {
            const { merchantId, ...rest } = p;
            return rest;
        },
        headerModifier: (h, hash) => ({ ...h, 'Authorization': `Bearer ${hash}`, 'MerchantID': OPAY_MERCHANT_ID })
    },
    // 3. Cashier Create (Variation 7)
    {
        name: 'Cashier Create',
        endpoint: '/api/v1/international/cashier/create',
        payloadModifier: (p) => {
            const { merchantId, payMethod, ...rest } = p;
            return rest;
        },
        headerModifier: (h, hash) => ({ ...h, 'Authorization': `Bearer ${hash}`, 'MerchantId': OPAY_MERCHANT_ID })
    },
    // 4. Payment Create - String Amount
    {
        name: 'Payment Create - String Amount, No inner MerchantId',
        endpoint: '/api/v1/international/payment/create',
        payloadModifier: (p) => {
            const { merchantId, ...rest } = p;
            return { ...rest, amount: { ...rest.amount, total: rest.amount.total.toString() } };
        },
        headerModifier: (h, hash) => ({ ...h, 'Authorization': `Bearer ${hash}`, 'MerchantId': OPAY_MERCHANT_ID })
    },
    // 5. Payment Create - WITH MerchantId inside AND Header
    {
        name: 'Payment Create - With MerchantId inside',
        endpoint: '/api/v1/international/payment/create',
        payloadModifier: (p) => p, // Keep merchantId
        headerModifier: (h, hash) => ({ ...h, 'Authorization': `Bearer ${hash}`, 'MerchantId': OPAY_MERCHANT_ID })
    },

    // Variation 8: Cashier Create without payMethod
    {
        name: 'Cashier Create - No payMethod',
        endpoint: '/api/v1/international/cashier/create',
        payloadModifier: (p) => {
            const { merchantId, payMethod, ...rest } = p; // Remove merchantId and payMethod
            return rest;
        },
        headerModifier: (h, hash) => ({ ...h, 'Authorization': `Bearer ${hash}`, 'MerchantId': OPAY_MERCHANT_ID })
    }
];

// ... rest of file ...

const generateAuthHeader = (payload: any) => {
    // Logic from OpayService.ts
    const stringToSign = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hash = crypto
        .createHmac('sha512', OPAY_SECRET_KEY)
        .update(stringToSign)
        .digest('hex');
    return `Bearer ${hash}`;
};

async function runMatrix() {
    console.log('STARTING MATRIX TEST...');

    // Base payload
    const basePayload = {
        merchantId: OPAY_MERCHANT_ID,
        reference: `TEST_${Date.now()}`,
        amount: { total: 10000, currency: 'NGN' },
        country: 'NG',
        // Minimal product info
        product: { name: 'Funding', description: 'Desc' },
        callbackUrl: 'https://ex.com',
        returnUrl: 'https://ex.com',
        payMethod: 'BankCard',
        expireAt: 30,
        userClientIP: '127.0.0.1',
        userInfo: { userId: '1', userEmail: 'test@email.com', userMobile: '0123456789', userName: 'Test' }
    };

    for (const config of configs) {
        console.log(`\n--- TESTING: ${config.name} ---`);
        try {
            // New reference for each test
            const currentPayload = { ...basePayload, reference: `TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}` };

            const modifiedPayload = config.payloadModifier(currentPayload);
            const stringified = JSON.stringify(modifiedPayload);

            // Calc hash
            const hash = crypto.createHmac('sha512', OPAY_SECRET_KEY).update(stringified).digest('hex');

            const headers = config.headerModifier({ 'Content-Type': 'application/json' }, hash);

            const response = await axios.post(
                `${OPAY_BASE_URL}${config.endpoint}`,
                stringified,
                { headers }
            );

            if (response.data.code === '00000') {
                console.log('✅ REAL SUCCESS!', response.data);
            } else {
                console.log(`❌ LOGICAL FAILURE [${response.data.code}]:`, response.data.message);
            }

        } catch (e: any) {
            const status = e.response?.status;
            const data = e.response?.data || {};
            console.log(`❌ NETWORK FAILURE [${status}]:`, data);
        }
        await new Promise(r => setTimeout(r, 500)); // Delay
    }
    console.log('\n--- MATRIX COMPLETE ---');
}

runMatrix();
