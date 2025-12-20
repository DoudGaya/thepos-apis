// Helper to test OPay Merchant ID
import dotenv from 'dotenv';
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';

// Load environment variables first
dotenv.config();

// Candidates
const merchantIds: string[] = ['256621082919878', '256625062910394'];
const publicKey: string = process.env.OPAY_PUBLIC_KEY || 'OPAYPUB17512103236410.10209526862698393';
const secretKey: string | undefined = process.env.OPAY_SECRET_KEY;

console.log('Testing Merchant IDs with Public Key:', publicKey);

async function testMerchant(mid: string): Promise<void> {
    console.log(`\nTesting Merchant ID: ${mid}`);
    try {
        const payload = {
            merchantId: mid,
            reference: `TEST_${Date.now()}`,
            amount: 100, // 1.00 NGN in kobo
            currency: "NGN",
            country: "NG",
            returnUrl: "https://example.com",
            callbackUrl: "https://example.com",
            userInfo: {
                userEmail: "test@example.com",
                userId: "123",
            },
            payMethod: "BankCard",
            product: {
                name: "Test",
                description: "Test"
            }
        };

        // For Server-to-Server, we assume 3DS payment creation is a good test
        // Endpoint: /api/v1/international/payment/create 
        // We typically use Signature for S2S calls
        // BUT the "Merchant is null" error 00003 often comes from mismatched params

        // Let's try to mimic the S2S call if we have the secret key
        if (!secretKey) {
            console.log("No Secret Key available in env to test S2S signature.");
            return;
        }

        const stringToSign = JSON.stringify(payload);
        const hash = crypto.createHmac('sha512', secretKey).update(stringToSign).digest('hex');

        const response = await axios.post(
            'https://sandboxapi.opaycheckout.com/api/v1/international/payment/create',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${hash}`,
                    'MerchantId': mid,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(`✅ Success for ${mid}:`, response.data);
    } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
            console.log(`❌ Failed for ${mid}:`, axiosError.response.data);
        } else if (error instanceof Error) {
            console.log(`❌ Error for ${mid}:`, error.message);
        } else {
            console.log(`❌ Unknown error for ${mid}:`, error);
        }
    }
}

// Run tests
(async () => {
    if (!secretKey) {
        console.log("⚠️ OPAY_SECRET_KEY not found in environment variables");
        console.log("Cannot proceed with merchant validation");
        process.exit(1);
    }

    console.log("\n🔍 Starting Merchant ID validation...\n");

    for (const mid of merchantIds) {
        await testMerchant(mid);
    }

    console.log("\n✅ Validation complete");
})();
