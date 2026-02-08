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
        // If we have a hardcoded access token in config (unlikely for prod but possible for dev)
        if (this.config.accessToken) return this.config.accessToken;

        // Check if current cached token is valid
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        // Refresh token logic would go here if using Client Credentials flow
        // For now, we'll assume the token is provided via env var or we'll retrieve it
        // NOTE: Nomba docs say "You will get an ACCESS_TOKEN". Usually this implies an auth endpoint.
        // However, for this implementation, we will assume the ACCESS_TOKEN is configured in ENV 
        // or we're using a long-lived one if available. 
        // If strictly OAuth2, we'd implementation /auth/token call here.

        // Fallback to checking process.env directly if not in config instance (dynamic reload)
        const envToken = process.env.NOMBA_ACCESS_TOKEN;
        if (envToken) return envToken;

        throw new Error('Nomba Access Token not configured');
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
                { headers }
            );

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
    accessToken: process.env.NOMBA_ACCESS_TOKEN, // Optional, can be fetched dynamically if implemented
    baseURL: process.env.NOMBA_BASE_URL || 'https://api.nomba.com',
});

export default nombaService;
export { NombaService, type InitializeTransactionData, type InitializeTransactionResponse };
