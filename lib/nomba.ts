/**
 * Nomba API integration service for backend
 */
import axios, { AxiosResponse } from 'axios';

interface NombaConfig {
    accountId: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    baseURL: string;
}

interface InitializeTransactionData {
    order: {
        amount: number; // Amount in Naira string or number
        currency: string;
        customerEmail: string;
        orderReference: string; // Unique reference
        callbackUrl: string;
        customerId?: string;
        accountId?: string; // Optional: specific account to deposit to
    };
    tokenizeCard?: boolean;
}

interface InitializeTransactionResponse {
    code: string;
    description: string;
    data: {
        checkoutLink: string;
        orderReference: string;
    };
}

class NombaService {
    private config: NombaConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(config: NombaConfig) {
        this.config = config;
    }

    private async getAccessToken(): Promise<string> {
        // 1. Check if we have a valid cached token (and it's not expired)
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        // 2. Check for hardcoded/env token first (Simple API Key integration)
        // If provided, we assume it's valid and long-lived.
        if (this.config.accessToken) {
            return this.config.accessToken;
        }

        const envToken = process.env.NOMBA_ACCESS_TOKEN;
        if (envToken) return envToken;

        // 3. If no static token, try to fetch new one using Client Credentials (OAuth2)
        if (this.config.clientId && this.config.clientSecret) {
            return this.fetchAccessToken();
        }

        throw new Error('Nomba Access Token not configured. Provide NOMBA_ACCESS_TOKEN or (NOMBA_CLIENT_ID + NOMBA_CLIENT_SECRET)');
    }

    private async fetchAccessToken(): Promise<string> {
        try {
            console.log('Fetching new Nomba Access Token...');
            const response = await axios.post(
                `${this.config.baseURL}/v1/auth/token/issue`,
                {
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    grant_type: 'client_credentials'
                },
                {
                    headers: { 
                        'Content-Type': 'application/json',
                        'accountId': this.config.accountId
                    },
                    timeout: 10000, // 10s
                }
            );

            if (response.data && response.data.data && response.data.data.access_token) {
                this.accessToken = response.data.data.access_token;
                
                // Parse expiresAt if available ("2026-02-18T20:02:32.283Z")
                if (response.data.data.expiresAt) {
                    const expiryTime = new Date(response.data.data.expiresAt).getTime();
                    this.tokenExpiry = expiryTime - 60000; // Buffer 60s
                } else {
                    // Fallback to default 1 hour
                    const expiresIn = response.data.data.expires_in || 3600;
                    this.tokenExpiry = Date.now() + (expiresIn * 1000) - 60000;
                }
                
                return this.accessToken as string;
            }	    

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                // Set expiry (default to 3500s or check response.expires_in)
                const expiresIn = response.data.expires_in || 3600;
                this.tokenExpiry = Date.now() + (expiresIn * 1000) - 60000; // Buffer 60s
                return this.accessToken as string;
            }

            throw new Error('Invalid response from Nomba Auth endpoint');
        } catch (error: any) {
            console.error('Failed to fetch Nomba Access Token:', error.response?.data || error.message);
            throw new Error('Authentication failed: Could not retrieve Access Token');
        }
    }

    private async getHeaders() {
        const token = await this.getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'accountId': this.config.accountId,
        };
    }

    /**
     * Initialize a checkout order
     */
    async initializeTransaction(data: InitializeTransactionData): Promise<InitializeTransactionResponse> {
        try {
            const headers = await this.getHeaders();

            // Ensure amount is formatted correctly (string or number as per docs)
            // Docs say "10000.00" string in example, but type says number<double>. safely handle both.
            const payload = {
                ...data,
                order: {
                    ...data.order,
                    amount: typeof data.order.amount === 'number' ? data.order.amount.toFixed(2) : data.order.amount
                }
            };

            const response: AxiosResponse<InitializeTransactionResponse> = await axios.post(
                `${this.config.baseURL}/v1/checkout/order`,
                payload,
                { headers, timeout: 15000 } // 15s
            );

            console.log('[NOMBA] Initialize response:', JSON.stringify(response.data, null, 2));

            if (response.data.code !== '00') {
                throw new Error(response.data.description || 'Failed to initialize Nomba transaction');
            }

            return response.data;
        } catch (error: any) {
            console.error('Nomba initialize transaction error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.description || error.message || 'Failed to initialize payment');
        }
    }

    /**
     * Verify an order status by its orderReference
     * Calls GET /v1/checkout/order/{orderReference}
     */
    async verifyOrder(orderReference: string): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.config.baseURL}/v1/checkout/order/${orderReference}`,
                { headers, timeout: 8000 } // 8s — fail fast so DB connections aren't held
            );
            console.log('[NOMBA] Verify order response:', JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error: any) {
            console.error('Nomba verify order error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.description || error.message || 'Failed to verify Nomba order');
        }
    }

    /**
     * Expire a virtual account (Example from docs)
     */
    async expireVirtualAccount(identifier: string): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.delete(
                `${this.config.baseURL}/v1/accounts/virtual/${identifier}`,
                { headers }
            );
            return response.data;
        } catch (error: any) {
            console.error('Nomba expire account error:', error.response?.data || error.message);
            throw error;
        }
    }
}

// Create and export default instance
const nombaService = new NombaService({
    accountId: process.env.NOMBA_ACCOUNT_ID || '',
    accessToken: process.env.NOMBA_ACCESS_TOKEN, // Optional if Client ID/Secret provided
    clientId: process.env.NOMBA_CLIENT_ID,
    clientSecret: process.env.NOMBA_CLIENT_SECRET,
    baseURL: process.env.NOMBA_BASE_URL || 'https://api.nomba.com',
});

export default nombaService;
export { NombaService, type InitializeTransactionData, type InitializeTransactionResponse };
