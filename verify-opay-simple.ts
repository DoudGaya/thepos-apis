
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';

const CREDENTIALS = {
    publicKey: 'OPAYPUB17512103236410.10209526862698393',
    secretKey: 'OPAYPRV17512103236410.4373670536079737',
    merchantId: '256625062910394' // The one from test file
};

async function test() {
    const payload = {
        merchantId: CREDENTIALS.merchantId,
        reference: `TEST_${Date.now()}`,
        amount: { total: 10000, currency: 'NGN' },
        country: 'NG',
        product: { name: 'Test', description: 'Test' },
        callbackUrl: 'http://localhost:3000',
        returnUrl: 'http://localhost:3000',
        payMethod: 'BankCard',
        expireAt: 30,
        userInfo: { userId: '1', userEmail: 'test@email.com' }
    };

    const stringToSign = JSON.stringify(payload);
    const hash = crypto.createHmac('sha512', CREDENTIALS.secretKey).update(stringToSign).digest('hex');

    try {
        const response = await axios.post(
            'https://sandboxapi.opaycheckout.com/api/v1/international/cashier/create',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${hash}`,
                    'MerchantId': CREDENTIALS.merchantId
                }
            }
        );

        const result = `CODE: ${response.data.code}\nMSG: ${response.data.message}\nDATA: ${JSON.stringify(response.data.data)}`;
        fs.writeFileSync('verify_result.txt', result);

    } catch (error: any) {
        const result = `ERROR: ${error.message}\nRES: ${JSON.stringify(error.response?.data)}`;
        fs.writeFileSync('verify_result.txt', result);
    }
}

test();
