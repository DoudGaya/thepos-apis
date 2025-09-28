/**
 * Paystack API integration service for backend
 */
import axios, { AxiosResponse } from 'axios';

interface PaystackConfig {
  secretKey: string;
  baseURL: string;
}

interface InitializeTransactionData {
  amount: number; // Amount in kobo
  email: string;
  currency?: string;
  reference?: string;
  callback_url?: string;
  metadata?: {
    user_id?: string;
    purpose?: string;
    [key: string]: any;
  };
  channels?: string[];
}

interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata?: {
      user_id?: string;
      purpose?: string;
      [key: string]: any;
    };
    fees?: number;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      phone: string | null;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

class PaystackService {
  private config: PaystackConfig;

  constructor(config: PaystackConfig) {
    this.config = config;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.config.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a transaction
   */
  async initializeTransaction(data: InitializeTransactionData): Promise<InitializeTransactionResponse> {
    try {
      const response: AxiosResponse<InitializeTransactionResponse> = await axios.post(
        `${this.config.baseURL}/transaction/initialize`,
        data,
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to initialize transaction');
      }

      return response.data;
    } catch (error: any) {
      console.error('Paystack initialize transaction error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
    try {
      const response: AxiosResponse<VerifyTransactionResponse> = await axios.get(
        `${this.config.baseURL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to verify transaction');
      }

      return response.data;
    } catch (error: any) {
      console.error('Paystack verify transaction error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  /**
   * Get all supported banks
   */
  async getBanks(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.baseURL}/bank`,
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      console.error('Paystack get banks error:', error.response?.data || error.message);
      throw new Error('Failed to get banks');
    }
  }

  /**
   * Get payment options for a specific amount
   */
  async getPaymentOptions(amount: number, email: string): Promise<any> {
    try {
      // For demonstration, return static payment options
      // In production, you might want to call Paystack's API for dynamic options
      const banks = await this.getBanks();
      
      return {
        card: {
          enabled: true,
          description: 'Pay with debit/credit card',
          fee: Math.ceil(amount * 0.015 + 100), // 1.5% + ₦100 cap at ₦2000
        },
        bank_transfer: {
          enabled: true,
          description: 'Transfer to our account',
          account_number: '0123456789',
          account_name: 'ThePOS Wallet Funding',
          bank_name: 'Paystack Titan Bank',
          fee: 50, // Flat ₦50 for bank transfer
        },
        ussd: {
          enabled: true,
          description: 'Dial USSD code',
          codes: {
            'Access Bank': '*901*000*amount#',
            'GTBank': '*737*000*amount#',
            'First Bank': '*894*000*amount#',
            'UBA': '*919*000*amount#',
            'Zenith Bank': '*966*000*amount#',
          },
          fee: 0, // No fee for USSD
        },
        mobile_money: {
          enabled: true,
          description: 'Pay with mobile money',
          providers: ['MTN', 'Airtel', 'Glo', '9mobile'],
          fee: 25, // Flat ₦25 for mobile money
        },
      };
    } catch (error: any) {
      console.error('Get payment options error:', error);
      throw new Error('Failed to get payment options');
    }
  }

  /**
   * Create a transfer recipient
   */
  async createTransferRecipient(data: {
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.baseURL}/transferrecipient`,
        { currency: 'NGN', ...data },
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      console.error('Paystack create transfer recipient error:', error.response?.data || error.message);
      throw new Error('Failed to create transfer recipient');
    }
  }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(data: {
    source: string;
    amount: number;
    recipient: string;
    reason?: string;
    reference?: string;
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.baseURL}/transfer`,
        data,
        { headers: this.headers }
      );

      return response.data;
    } catch (error: any) {
      console.error('Paystack initiate transfer error:', error.response?.data || error.message);
      throw new Error('Failed to initiate transfer');
    }
  }
}

// Create and export default instance
const paystackService = new PaystackService({
  secretKey: process.env.PAYSTACK_SECRET_KEY || '',
  baseURL: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
});

export default paystackService;
export { PaystackService, type InitializeTransactionData, type VerifyTransactionResponse };