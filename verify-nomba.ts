
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function testNombaAuth() {
    const clientId = process.env.NOMBA_CLIENT_ID;
    const clientSecret = process.env.NOMBA_CLIENT_SECRET;
    const accountId = process.env.NOMBA_ACCOUNT_ID;
    const baseUrl = process.env.NOMBA_BASE_URL || 'https://api.nomba.com';

    console.log('Testing Nomba Auth...');
    console.log('URL:', `${baseUrl}/auth/token`);
    console.log('Client ID:', clientId);
    console.log('Client Secret (first 5 chars):', clientSecret?.substring(0, 5));

    try {
        const response = await axios.post(
            `https://api.nomba.com/v1/auth/token`,
            {
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials'
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        console.log('SUCCESS!');
        console.log('Access Token:', response.data.data?.access_token || response.data.access_token);
        console.log('Expires In:', response.data.data?.expires_in || response.data.expires_in);
    } catch (error: any) {
        console.error('FAILED!');
        console.error('Status:', error.response?.status);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Message:', error.message);
    }
}

testNombaAuth();
