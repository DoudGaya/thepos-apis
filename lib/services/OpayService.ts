/**
 * OPay Payment Service
 * Handles payment initialization, verification, and webhook validation
 * Based on OPay International & React Native SDK Documentation
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

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
        this.baseUrl = process.env.OPAY_BASE_URL || 'https://api.opaycheckout.com';

        // Production-safe logging - only log configuration status
        logger.info('[OPay] Service initialized', {
            configured: !!(this.publicKey && this.secretKey && this.merchantId),
            baseUrl: this.baseUrl,
        });

        if (!this.publicKey || !this.secretKey || !this.merchantId) {
            logger.warn('[OPay] credentials not fully configured');
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
     * Calls the Server-to-Server Create Payment API
     */
    async initializePayment(data: OpayPaymentData): Promise<any> {
        // Validate configuration
        if (!this.merchantId || !this.publicKey) {
            throw new Error('OPay service not fully configured (missing MerchantID or PublicKey)');
        }

        logger.debug('[OPay] Initializing Cashier Payment for reference:', data.reference);

        // Construct Payload for Cashier API
        // https://doc.opaycheckout.com/view/content/20000/21000/21010
        const payload = {
            country: data.country || 'NG',
            reference: data.reference,
            amount: {
                total: data.amount, // in kobo/minor units
                currency: data.currency || 'NGN',
            },
            returnUrl: data.returnUrl,
            callbackUrl: data.callbackUrl,
            cancelUrl: data.returnUrl, // Redirect back to wallet on cancel too
            userClientIP: '127.0.0.1', // Should be real user IP in production
            expireAt: 30, // Minutes
            evokeOpay: true, // Enable OPay App Express Checkout
            userInfo: {
                userEmail: data.userInfo.userEmail,
                userId: data.userInfo.userId,
                userMobile: data.userInfo.userMobile || '09000000000',
                userName: data.userInfo.userName || data.userInfo.userEmail.split('@')[0],
            },
            product: {
                name: 'Wallet Funding',
                description: `Fund wallet with ${((data.amount || 0) / 100).toFixed(2)} ${data.currency || 'NGN'}`,
            },
            // payMethod: 'BalancePayment', // Removed: Causing 02003 error. Omittting allows all methods.
            // If "payMethod" is omitted, user sees all options. For Express, "evokeOpay:true" is key.
        };

        try {
            // For cashier/create, the documentation and PHP example specify using "Bearer {PublicKey}"
            // NOT the HMAC signature (which is for status/query).
            const authHeader = `Bearer ${this.publicKey}`;
            const endpoint = '/api/v1/international/cashier/create';

            logger.debug('[OPay] Sending request to:', this.baseUrl + endpoint);

            const response = await this.client.post(endpoint, payload, {
                headers: {
                    'Authorization': authHeader,
                    'MerchantId': this.merchantId,
                },
            });

            if (response.data.code === '00000') {
                logger.transaction('OPay payment initialized', data.reference, {
                    orderNo: response.data.data.orderNo,
                    status: 'initialized'
                });

                return {
                    status: 'success',
                    message: 'OPay payment initialized',
                    data: {
                        ...response.data.data,
                        // Ensure we pass cashierUrl explicitly if it's there
                        cashierUrl: response.data.data.cashierUrl
                    }
                };
            } else {
                logger.error('[OPay] API returned error code:', response.data.code);
                throw new Error(response.data.message || 'OPay initialization failed');
            }
        } catch (error: any) {
            logger.error('[OPay] HTTP Request failed', error);
            throw new Error(`OPay initialization failed: ${error.message}`);
        }
    }


    /**
     * Verify OPay payment
     * Query cashier status endpoint
     */
    async verifyPayment(reference: string, orderNo?: string): Promise<OpayVerificationResponse> {
        logger.debug('[OPay] Verifying payment:', reference);

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
                logger.transaction('OPay payment verified', reference, {
                    status: response.data.data.status,
                    amount: response.data.data.amount.total / 100,
                });
                return response.data;
            } else {
                logger.error('[OPay] Payment verification failed', response.data.message);
                throw new Error(response.data.message || 'OPay payment verification failed');
            }
        } catch (error: any) {
            logger.error('[OPay] Payment verification error', error);
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
            logger.error('[OPay] Webhook signature validation error', error);
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
