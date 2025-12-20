/**
 * OPay Payment Service
 * Handles payment initialization, verification, and webhook validation
 * Based on OPay International & React Native SDK Documentation
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

interface OpayPaymentData {
    reference: string;
    amount: number;
    currency?: string;
    country?: string;
    userInfo: {
        userEmail: string;
        userId: string;
        userName?: string;
        userMobile?: string;
    };
    callbackUrl: string;
    returnUrl?: string;
}

interface OpayPaymentResponse {
    code: string;
    message: string;
    data: {
        reference: string;
        orderNo: string;
        status: string;
        amount: {
            total: number;
            currency: string;
        };
        vat?: {
            total: number;
            currency: string;
        };
        nextAction?: {
            actionType: string;
            redirectUrl: string;
        };
        cashierUrl?: string; // For backward compatibility
    };
}

interface OpayVerificationResponse {
    code: string;
    message: string;
    data: {
        reference: string;
        orderNo: string;
        status: string; // 'SUCCESS' | 'FAIL' | 'PENDING' | 'INITIAL' | 'CLOSE'
        amount: {
            total: number;
            currency: string;
        };
        vat?: {
            total: number;
            currency: string;
        };
    };
}

class OpayService {
    private client: AxiosInstance;
    private publicKey: string;
    private secretKey: string;
    private merchantId: string;
    private baseUrl: string;

    constructor() {
        this.publicKey = process.env.OPAY_PUBLIC_KEY || '';
        this.secretKey = process.env.OPAY_SECRET_KEY || '';
        this.merchantId = process.env.OPAY_MERCHANT_ID || '';
        this.baseUrl = process.env.OPAY_BASE_URL || 'https://sandboxapi.opaycheckout.com';

        // Debug logging
        console.log('🔧 [OPay] Configuration loaded:', {
            publicKeyPresent: !!this.publicKey,
            secretKeyPresent: !!this.secretKey,
            merchantIdPresent: !!this.merchantId,
            merchantId: this.merchantId,
            baseUrl: this.baseUrl,
        });

        if (!this.publicKey || !this.secretKey || !this.merchantId) {
            console.warn('⚠️ [OPay] credentials not fully configured');
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Generate authorization header for OPay API requests
     * Using HMAC-SHA512 as per OPay documentation
     */
    private generateAuthHeader(payload: any): string {
        // If payload is already a string, use it directly (to match axios body)
        // If it's an object, stringify it
        const stringToSign = typeof payload === 'string' ? payload : JSON.stringify(payload);

        const hash = crypto
            .createHmac('sha512', this.secretKey)
            .update(stringToSign)
            .digest('hex');

        return `Bearer ${hash}`;
    }

    /**
     * Initialize OPay payment - Cashier API
     * Based on OPay React Native SDK documentation
     */
    async initializePayment(data: OpayPaymentData): Promise<any> {
        // Validate configuration
        if (!this.merchantId || !this.publicKey) {
            throw new Error('OPay service not fully configured (missing MerchantID or PublicKey)');
        }

        console.log('🔵 [OPay] Generating SDK parameters for reference:', data.reference);

        // Prepare parameters for React Native SDK
        // The SDK requires these specific field names
        const payParams = {
            publicKey: this.publicKey,
            merchantId: this.merchantId,
            merchantName: "ThePOS", // Configurable or hardcoded for now
            reference: data.reference,
            countryCode: data.country || 'NG',
            currency: data.currency || 'NGN',
            payAmount: data.amount, // Amount in kobo/minor units
            productName: 'Wallet Funding',
            productDescription: `Fund wallet with ${((data.amount || 0) / 100).toFixed(2)} ${data.currency || 'NGN'}`,
            callbackUrl: data.callbackUrl || 'https://the-pos.com/callback',
            paymentType: '', // Empty string usually means all methods, but verifying against docs
            expireAt: 30, // Minutes
            userClientIP: '1.1.1.1', // OPay requires a valid public IP format, not localhost
            userInfo: {
                userId: data.userInfo.userId,
                userName: data.userInfo.userName || data.userInfo.userEmail.split('@')[0],
                userEmail: data.userInfo.userEmail,
                userMobile: data.userInfo.userMobile || '09000000000'
            }
        };

        // Return successfully with the params
        return {
            status: 'success',
            message: 'OPay parameters generated',
            data: {
                payParams
            }
        };
    }


    /**
     * Verify OPay payment
     * Query cashier status endpoint
     */
    async verifyPayment(reference: string, orderNo?: string): Promise<OpayVerificationResponse> {
        console.log('🔍 [OPay] Verifying payment:', { reference, orderNo });

        const payload = {
            publicKey: this.publicKey,
            merchantId: this.merchantId,
            reference: reference,
            countryCode: 'NG',
        };

        try {
            const authHeader = this.generateAuthHeader(payload);

            const response = await this.client.post<OpayVerificationResponse>(
                '/api/v1/international/cashier/status',
                payload,
                {
                    headers: {
                        'Authorization': authHeader,
                        'MerchantId': this.merchantId,
                    },
                }
            );

            if (response.data.code === '00000') {
                console.log('✅ [OPay] Payment verification successful:', {
                    reference: response.data.data.reference,
                    status: response.data.data.status,
                    amount: response.data.data.amount.total / 100,
                });
                return response.data;
            } else {
                console.error('❌ [OPay] Payment verification failed:', response.data.message);
                throw new Error(response.data.message || 'OPay payment verification failed');
            }
        } catch (error: any) {
            console.error('❌ [OPay] Payment verification error:', error.response?.data || error.message);
            throw new Error(`OPay payment verification failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Validate OPay webhook signature
     */
    validateWebhookSignature(signature: string, payload: string): boolean {
        try {
            const expectedSignature = crypto
                .createHash('sha512')
                .update(payload + this.secretKey)
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            console.error('❌ [OPay] Webhook signature validation error:', error);
            return false;
        }
    }

    /**
     * Check if OPay is configured
     */
    isConfigured(): boolean {
        return !!(this.publicKey && this.secretKey && this.merchantId);
    }
}

export const opayService = new OpayService();
export default opayService;
