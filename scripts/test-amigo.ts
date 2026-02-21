import 'dotenv/config';
import axios from 'axios';

async function testAmigo() {
    const AMIGO_API_KEY = process.env.AMIGO_API_TOKEN || process.env.AMIGO_API_KEY;
    const AMIGO_BASE_URL = process.env.AMIGO_BASE_URL || 'https://amigo.ng/api';

    console.log('Testing Amigo API Connection...');
    console.log('Base URL:', AMIGO_BASE_URL);

    if (!AMIGO_API_KEY) {
        console.error('❌ Error: AMIGO_API_TOKEN (or AMIGO_API_KEY) is not defined in environment variables.');
        return;
    } else {
        console.log('AMIGO_API_KEY found (length:', AMIGO_API_KEY.length + ')');
    }

    try {
        console.log('Sending request to /plans/efficiency...');
        const response = await axios.get(`${AMIGO_BASE_URL}/plans/efficiency`, {
            headers: {
                'X-API-Key': AMIGO_API_KEY
            }
        });

        console.log('Status Code:', response.status);
        if (response.status === 200) {
            console.log('✅ Amigo API connection successful!');
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
        } else {
            console.log('❌ Amigo API connection failed with status:', response.status);
        }

    } catch (error: any) {
        console.error('❌ Error connecting to Amigo API:');
        if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('Data:', error.response?.data);
            console.error('Message:', error.message);
        } else {
            console.error(error);
        }
    }
}

testAmigo();
