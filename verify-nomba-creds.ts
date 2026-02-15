import { loadEnvConfig } from '@next/env';
import axios from 'axios';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function verifyNombaCreds() {
    const clientId = process.env.NOMBA_CLIENT_ID;
    const clientSecret = process.env.NOMBA_CLIENT_SECRET;
    const accountId = process.env.NOMBA_ACCOUNT_ID;
    const baseUrl = process.env.NOMBA_BASE_URL || 'https://api.nomba.com';

    console.log('--- Nomba Credentials Verification ---');
    console.log(`Base URL: ${baseUrl}`);
    console.log(`Account ID: ${accountId ? 'Set' : 'Missing'}`);
    console.log(`Client ID: ${clientId ? 'Set' : 'Missing'}`);
    console.log(`Client Secret: ${clientSecret ? 'Set' : 'Missing'}`);
    console.log('--------------------------------------');

    if (!clientId || !clientSecret) {
        console.error('Error: NOMBA_CLIENT_ID or NOMBA_CLIENT_SECRET is missing in environment variables.');
        return;
    }

    const payload = {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
    };

    // List of endpoints to test
    const endpoints = [
        '/auth/token',
        '/v1/auth/token',
        '/v1/auth/login',
        '/auth/login',
        '/api/v1/auth/token'
    ];

    for (const path of endpoints) {
        await testEndpoint(baseUrl, path, payload);
    }
}

async function testEndpoint(baseUrl: string, path: string, payload: any) {
    const url = `${baseUrl}${path}`;
    console.log(`\nTesting endpoint: ${url}`);
    try {
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Success!');
        console.log('Status:', response.status);
        if (response.data.access_token) {
             console.log('Access Token:', response.data.access_token);
        } else {
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
        }
        
    } catch (error: any) {
        console.error('❌ Failed!');
        if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

verifyNombaCreds();
