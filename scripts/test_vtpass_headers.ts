
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.VTPASS_API_KEY!;
const publicKey = process.env.VTPASS_PUBLIC_KEY!;
const secretKey = process.env.VTPASS_SECRET_KEY!;

async function testHeaders() {
    const requestId = `test_h_${Date.now()}`;
    const payload = {
        request_id: requestId,
        serviceID: 'mtn',
        amount: 50,
        phone: '08011111111'
    };

    console.log('--- Testing Secret Key Header ---');
    try {
        const res = await axios.post('https://sandbox.vtpass.com/api/pay', payload, {
            headers: {
                'api-key': apiKey,
                'secret-key': secretKey,
                'Content-Type': 'application/json'
            }
        });
        console.log('Secret Key Result:', res.data.code, res.data.response_description);
    } catch (e: any) {
        console.log('Secret Key Error:', e.response?.data || e.message);
    }

    console.log('\n--- Testing Public Key Header ---');
    try {
        const res = await axios.post('https://sandbox.vtpass.com/api/pay', payload, {
            headers: {
                'api-key': apiKey,
                'public-key': publicKey,
                'Content-Type': 'application/json'
            }
        });
        console.log('Public Key Result:', res.data.code, res.data.response_description);
    } catch (e: any) {
        console.log('Public Key Error:', e.response?.data || e.message);
    }
}

testHeaders();
