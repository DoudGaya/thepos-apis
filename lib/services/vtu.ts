/**
 * VTU.NG Service Provider
 * Comprehensive integration for data, airtime, electricity, cable TV, betting, and ePINs
 * Pricing Strategy: Cost + Referral Margin + Profit = Customer Price
 * Example: Buy at 650 + 50 referral = 700 per GB to customer
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  BaseProvider,
  DataPlan,
  BillService,
  TransactionRequest,
  TransactionResponse,
  ProviderHealth,
} from './types';

// VTU.NG Configuration
const VTU_BASE_URL = 'https://vtu.ng/wp-json';
const VTU_AUTH_URL = `${VTU_BASE_URL}/jwt-auth/v1/token`;
const VTU_API_URL = `${VTU_BASE_URL}/api/v2`;

// Pricing Configuration
const REFERRAL_MARGIN = 50; // Naira per GB for referral program
const AIRTIME_DISCOUNT = 0.03; // 3% discount from VTU
const DATA_MARKUP_PERCENT = 0.0; // Additional markup on data
const ELECTRICITY_DISCOUNT_RANGE = { min: 0.001, max: 0.015 }; // 0.1% to 1.5%
const TV_DISCOUNT_RANGE = { min: 0.01, max: 0.015 }; // 1% to 1.5%
const EPINS_DISCOUNT = 0.04; // 4% for 9mobile, lower for others

// VTU.NG Types
interface VTUAuthResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}

interface VTUBalanceResponse {
  code: string;
  message: string;
  data: {
    balance: number;
    currency: string;
  };
}

interface VTUDataVariation {
  variation_id: number;
  service_name: string;
  service_id: string;
  data_plan: string;
  price: string;
  availability: 'Available' | 'Unavailable';
}

interface VTUTVVariation {
  variation_id: number;
  service_name: string;
  service_id: string;
  package_bouquet: string;
  price: string;
  availability: 'Available' | 'Unavailable';
}

interface VTUOrderResponse {
  code: string;
  message: string;
  data: {
    order_id: number;
    status: string;
    product_name: string;
    service_name: string;
    amount: number;
    discount: string;
    amount_charged: string;
    initial_balance: string;
    final_balance: string;
    request_id: string;
    variation_id?: string;
    data_plan?: string;
    phone?: string;
    customer_id?: string;
    customer_name?: string;
    token?: string;
    units?: string;
    epins?: Array<{
      amount: string;
      pin: string;
      serial: string;
      instruction: string;
    }>;
  };
}

interface VTUVerifyCustomerResponse {
  code: string;
  message: string;
  data: {
    service_name: string;
    customer_id: string;
    customer_name: string;
    customer_address?: string;
    customer_arrears?: number;
    outstanding?: number;
    meter_number?: string;
    account_number?: string;
    status?: string;
    due_date?: string;
    balance?: number;
    current_bouquet?: string;
    renewal_amount?: number;
    min_purchase_amount?: number;
    max_purchase_amount?: number;
    customer_username?: string;
    customer_email_address?: string;
    customer_phone_number?: string;
    minimum_amount?: number;
    maximum_amount?: number;
  };
}

interface VTURequeryResponse {
  code: string;
  message: string;
  data: {
    order_id: number;
    status: string;
    product_name: string;
    quantity: number;
    amount: string;
    amount_charged: string;
    date_created: string;
    date_updated: string;
    request_id: string;
    meta_data: Record<string, any>;
    epins?: Array<{
      Amount: string;
      pin: string;
      serial_number: string;
      instruction: string;
    }>;
  };
}

export class VTUProvider extends BaseProvider {
  id = 'vtu';
  name = 'VTU.NG';
  type = 'multi' as const;
  
  // Private properties
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiryTime: Date | null = null;
  private username: string;
  private password: string;
  private userPin: string;
  private isActive = true;

  constructor() {
    const username = process.env.VTU_USERNAME || '';
    const password = process.env.VTU_PASSWORD || '';
    const userPin = process.env.VTU_USER_PIN || '';
    const baseUrl = process.env.VTU_BASE_URL || VTU_API_URL;
    
    // Create config for BaseProvider
    const config: any = {
      id: 'vtu',
      name: 'VTU.NG',
      type: 'multi' as const,
      baseUrl,
      isActive: true,
      priority: 3,
      credentials: {
        username,
        password,
        pin: userPin,
      },
      features: ['data', 'airtime', 'electricity', 'cable', 'betting', 'epins'],
    };
    
    // Call parent constructor
    super(config);
    
    // Initialize VTU-specific properties
    this.username = username;
    this.password = password;
    this.userPin = userPin;

    if (!this.username || !this.password) {
      console.warn('VTU.NG credentials not configured');
      this.isActive = false;
    }

    this.client = axios.create({
      baseURL: VTU_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.client.interceptors.request.use(
      async (config) => {
        // Skip auth for public endpoints
        if (
          config.url?.includes('/variations/') ||
          config.url?.includes('/jwt-auth/')
        ) {
          return config;
        }

        // Ensure token is valid
        await this.ensureValidToken();
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 403) {
          // Token expired, retry once
          this.token = null;
          await this.ensureValidToken();
          return this.client.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate and get JWT token
   */
  private async authenticate(): Promise<string> {
    try {
      const response = await axios.post<VTUAuthResponse>(VTU_AUTH_URL, {
        username: this.username,
        password: this.password,
      });

      this.token = response.data.token;
      // Token expires after 7 days, refresh before then
      this.tokenExpiryTime = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
      
      console.log('VTU.NG authentication successful');
      return this.token;
    } catch (error: any) {
      console.error('VTU.NG authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with VTU.NG');
    }
  }

  /**
   * Ensure token is valid, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.token || !this.tokenExpiryTime || new Date() >= this.tokenExpiryTime) {
      await this.authenticate();
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(prefix: string = 'req'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Calculate customer price with markup
   */
  private calculateCustomerPrice(
    costPrice: number,
    type: 'data' | 'airtime' | 'electricity' | 'tv' | 'betting' | 'epins'
  ): number {
    switch (type) {
      case 'data':
        // Cost + Referral Margin (e.g., 650 + 50 = 700)
        return costPrice + REFERRAL_MARGIN;
      
      case 'airtime':
        // Already discounted 3%, add small markup
        return Math.ceil(costPrice * 1.01); // 1% markup
      
      case 'electricity':
        // Already has 0.1-1.5% discount, pass directly or add small margin
        return Math.ceil(costPrice * 1.005); // 0.5% markup
      
      case 'tv':
        // Already has 1-1.5% discount, pass directly or add small margin
        return Math.ceil(costPrice * 1.005); // 0.5% markup
      
      case 'betting':
        // 0-0.2% discount, add small margin
        return Math.ceil(costPrice * 1.01); // 1% markup
      
      case 'epins':
        // Already has 4% discount on 9mobile, 0.5-1% on others
        return Math.ceil(costPrice * 1.02); // 2% markup
      
      default:
        return costPrice;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      await this.ensureValidToken();
      const balance = await this.getBalance();
      const responseTime = Date.now() - startTime;

      return {
        provider: this.id,
        status: balance > 0 ? 'online' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        errorRate: 0,
      };
    } catch (error) {
      return {
        provider: this.id,
        status: 'offline',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        errorRate: 100,
      };
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    try {
      const response = await this.client.get<VTUBalanceResponse>('/balance');
      return response.data.data.balance;
    } catch (error: any) {
      console.error('Failed to get VTU balance:', error.response?.data || error.message);
      throw new Error('Failed to retrieve wallet balance');
    }
  }

  /**
   * Get all data plans with pricing
   */
  async getDataPlans(): Promise<DataPlan[]> {
    try {
      const response = await axios.get<{
        code: string;
        message: string;
        product: string;
        data: VTUDataVariation[];
      }>(`${VTU_API_URL}/variations/data`);

      const plans = response.data.data
        .filter((variation) => variation.availability === 'Available')
        .map((variation) => {
          const costPrice = parseFloat(variation.price);
          const customerPrice = this.calculateCustomerPrice(costPrice, 'data');
          const commission = customerPrice - costPrice;

          return {
            id: `vtu_${variation.variation_id}`,
            networkId: variation.service_id,
            network: variation.service_name,
            planType: this.determinePlanType(variation.data_plan),
            name: variation.data_plan,
            size: this.extractDataSize(variation.data_plan),
            validity: this.extractValidity(variation.data_plan),
            price: customerPrice,
            originalPrice: costPrice,
            commission,
            isActive: true,
            providerId: this.id,
            variationId: variation.variation_id.toString(),
          };
        });

      return plans;
    } catch (error: any) {
      console.error('Failed to get VTU data plans:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get data plans for specific network
   */
  async getDataPlansByNetwork(network: string): Promise<DataPlan[]> {
    try {
      const serviceId = this.normalizeNetworkId(network);
      const response = await axios.get<{
        code: string;
        message: string;
        product: string;
        data: VTUDataVariation[];
      }>(`${VTU_API_URL}/variations/data?service_id=${serviceId}`);

      const plans = response.data.data
        .filter((variation) => variation.availability === 'Available')
        .map((variation) => {
          const costPrice = parseFloat(variation.price);
          const customerPrice = this.calculateCustomerPrice(costPrice, 'data');
          const commission = customerPrice - costPrice;

          return {
            id: `vtu_${variation.variation_id}`,
            networkId: variation.service_id,
            network: variation.service_name,
            planType: this.determinePlanType(variation.data_plan),
            name: variation.data_plan,
            size: this.extractDataSize(variation.data_plan),
            validity: this.extractValidity(variation.data_plan),
            price: customerPrice,
            originalPrice: costPrice,
            commission,
            isActive: true,
            providerId: this.id,
            variationId: variation.variation_id.toString(),
          };
        });

      return plans;
    } catch (error: any) {
      console.error(`Failed to get VTU data plans for ${network}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get TV/Cable variations
   */
  async getTVVariations(serviceId?: string): Promise<VTUTVVariation[]> {
    try {
      const url = serviceId 
        ? `${VTU_API_URL}/variations/tv?service_id=${serviceId}`
        : `${VTU_API_URL}/variations/tv`;
      
      const response = await axios.get<{
        code: string;
        message: string;
        product: string;
        data: VTUTVVariation[];
      }>(url);

      return response.data.data.filter((v) => v.availability === 'Available');
    } catch (error: any) {
      console.error('Failed to get TV variations:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get bill services (electricity, cable TV)
   */
  async getBillServices(): Promise<BillService[]> {
    const services: BillService[] = [];

    // Electricity providers
    const electricityProviders = [
      { id: 'ikeja-electric', name: 'Ikeja Electric (IKEDC)', states: 'Lagos (Ikeja)' },
      { id: 'eko-electric', name: 'Eko Electric (EKEDC)', states: 'Lagos (Eko)' },
      { id: 'kano-electric', name: 'Kano Electric (KEDCO)', states: 'Kano, Katsina, Jigawa' },
      { id: 'portharcourt-electric', name: 'Port Harcourt Electric (PHED)', states: 'Rivers, Akwa Ibom, Bayelsa, Cross River' },
      { id: 'jos-electric', name: 'Jos Electric (JED)', states: 'Bauchi, Benue, Gombe, Plateau' },
      { id: 'ibadan-electric', name: 'Ibadan Electric (IBEDC)', states: 'Oyo, Ogun, Osun, Kwara' },
      { id: 'kaduna-electric', name: 'Kaduna Electric (KAEDCO)', states: 'Kaduna, Kebbi, Sokoto, Zamfara' },
      { id: 'abuja-electric', name: 'Abuja Electric (AEDC)', states: 'FCT, Kogi, Niger, Nasarawa' },
      { id: 'enugu-electric', name: 'Enugu Electric (EEDC)', states: 'Anambra, Enugu, Imo, Ebonyi' },
      { id: 'benin-electric', name: 'Benin Electric (BEDC)', states: 'Delta, Edo, Ekiti, Ondo' },
      { id: 'aba-electric', name: 'Aba Electric (ABEDC)', states: 'Abia' },
      { id: 'yola-electric', name: 'Yola Electric (YEDC)', states: 'Adamawa, Taraba, Borno, Yobe' },
    ];

    electricityProviders.forEach((provider) => {
      services.push({
        id: `vtu_${provider.id}_prepaid`,
        billerId: provider.id,
        name: `${provider.name} - Prepaid`,
        category: 'electricity',
        type: 'prepaid',
        commission: 15, // Varies by provider (0.1-1.5%)
        isActive: true,
        providerId: this.id,
        fields: [
          {
            name: 'customer_id',
            type: 'text',
            label: 'Meter Number',
            required: true,
            validation: '^[0-9]{11}$',
          },
          {
            name: 'amount',
            type: 'number',
            label: 'Amount (NGN)',
            required: true,
            validation: '^[0-9]+$',
          },
        ],
      });

      services.push({
        id: `vtu_${provider.id}_postpaid`,
        billerId: provider.id,
        name: `${provider.name} - Postpaid`,
        category: 'electricity',
        type: 'postpaid',
        commission: 15,
        isActive: true,
        providerId: this.id,
        fields: [
          {
            name: 'customer_id',
            type: 'text',
            label: 'Account Number',
            required: true,
            validation: '^[0-9]{11}$',
          },
          {
            name: 'amount',
            type: 'number',
            label: 'Amount (NGN)',
            required: true,
            validation: '^[0-9]+$',
          },
        ],
      });
    });

    // Cable TV providers
    const cableProviders = [
      { id: 'dstv', name: 'DStv' },
      { id: 'gotv', name: 'GOtv' },
      { id: 'startimes', name: 'Startimes' },
      { id: 'showmax', name: 'Showmax' },
    ];

    for (const provider of cableProviders) {
      const variations = await this.getTVVariations(provider.id);
      
      services.push({
        id: `vtu_${provider.id}`,
        billerId: provider.id,
        name: provider.name,
        category: 'cable',
        type: 'prepaid',
        commission: 10, // 1-1.5%
        isActive: true,
        providerId: this.id,
        fields: [
          {
            name: 'customer_id',
            type: 'text',
            label: 'Smartcard/IUC Number',
            required: true,
            validation: '^[0-9]{10}$',
          },
          {
            name: 'variation_id',
            type: 'select',
            label: 'Package',
            required: true,
            options: variations.map((v) => ({
              value: v.variation_id.toString(),
              label: `${v.package_bouquet} - ₦${v.price}`,
            })),
          },
          {
            name: 'subscription_type',
            type: 'select',
            label: 'Subscription Type',
            required: false,
            options: [
              { value: 'change', label: 'Change/Activate' },
              { value: 'renew', label: 'Renew' },
            ],
          },
        ],
      });
    }

    return services;
  }

  /**
   * Verify customer (electricity, cable TV, betting)
   */
  async verifyCustomer(
    serviceId: string,
    customerId: string,
    variationId?: string
  ): Promise<VTUVerifyCustomerResponse['data']> {
    try {
      const payload: any = {
        customer_id: customerId,
        service_id: serviceId,
      };

      if (variationId) {
        payload.variation_id = variationId;
      }

      const response = await this.client.post<VTUVerifyCustomerResponse>(
        '/verify-customer',
        payload
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Customer verification failed:', error.response?.data || error.message);
      throw new Error('Failed to verify customer details');
    }
  }

  /**
   * Purchase airtime
   */
  async purchaseAirtime(
    phone: string,
    network: string,
    amount: number,
    requestId?: string
  ): Promise<TransactionResponse> {
    try {
      const serviceId = this.normalizeNetworkId(network);
      const payload = {
        request_id: requestId || this.generateRequestId('airtime'),
        phone: this.normalizePhoneNumber(phone),
        service_id: serviceId,
        amount,
      };

      const response = await this.client.post<VTUOrderResponse>('/airtime', payload);
      
      return this.mapToTransactionResponse(response.data, 'airtime');
    } catch (error: any) {
      console.error('Airtime purchase failed:', error.response?.data || error.message);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Purchase data
   */
  async purchaseData(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      if (!request.planId) {
        throw new Error('Plan ID is required');
      }

      const variationId = request.planId.replace('vtu_', '');
      const payload = {
        request_id: request.id || this.generateRequestId('data'),
        phone: this.normalizePhoneNumber(request.customerInfo.phone || ''),
        service_id: this.extractServiceId(request.metadata?.network),
        variation_id: variationId,
      };

      const response = await this.client.post<VTUOrderResponse>('/data', payload);
      
      return this.mapToTransactionResponse(response.data, 'data');
    } catch (error: any) {
      console.error('Data purchase failed:', error.response?.data || error.message);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Process transaction (required by BaseProvider interface)
   */
  async processTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    switch (request.type) {
      case 'data':
        return this.purchaseData(request);
      
      case 'airtime':
        if (!request.customerInfo.phone || !request.network || !request.amount) {
          throw new Error('Phone, network, and amount are required for airtime');
        }
        return this.purchaseAirtime(
          request.customerInfo.phone,
          request.network,
          request.amount,
          request.id
        );
      
      case 'electricity':
        if (!request.billerId || !request.customerInfo.customerId || !request.variationId || !request.amount) {
          throw new Error('Provider, customer ID, meter type, and amount are required for electricity');
        }
        return this.purchaseElectricity(
          request.billerId,
          request.customerInfo.customerId,
          request.variationId as 'prepaid' | 'postpaid',
          request.amount,
          request.id
        );
      
      case 'cable':
        if (!request.billerId || !request.customerInfo.customerId || !request.variationId) {
          throw new Error('Provider, smartcard number, and package ID are required for cable TV');
        }
        return this.purchaseCableTV(
          request.billerId,
          request.customerInfo.customerId,
          request.variationId,
          request.subscriptionType,
          request.amount,
          request.id
        );
      
      case 'betting':
        if (!request.billerId || !request.customerInfo.customerId || !request.amount) {
          throw new Error('Provider, customer ID, and amount are required for betting');
        }
        return this.fundBetting(
          request.billerId,
          request.customerInfo.customerId,
          request.amount,
          request.id
        );
      
      case 'epins':
        if (!request.network || !request.value || !request.quantity) {
          throw new Error('Network, value, and quantity are required for ePINs');
        }
        return this.purchaseEpins(
          request.network,
          request.value,
          request.quantity,
          request.id
        );
      
      default:
        throw new Error(`Unsupported transaction type: ${request.type}`);
    }
  }

  /**
   * Verify transaction (required by BaseProvider interface)
   */
  async verifyTransaction(reference: string): Promise<TransactionResponse> {
    try {
      const orderData = await this.requeryOrder(reference);
      
      const isSuccessful = orderData.status === 'completed-api';
      const isPending = orderData.status.includes('processing') || 
                        orderData.status.includes('initiated') ||
                        orderData.status.includes('queued');
      const isRefunded = orderData.status === 'refunded';

      return {
        success: isSuccessful,
        transactionId: orderData.order_id.toString(),
        reference: orderData.request_id,
        status: isSuccessful ? 'successful' : isPending ? 'processing' : isRefunded ? 'failed' : 'pending',
        message: `Order ${orderData.status}`,
        metadata: {
          provider: 'vtu',
          product_name: orderData.product_name,
          amount: orderData.amount,
          amount_charged: orderData.amount_charged,
          meta_data: orderData.meta_data,
          epins: orderData.epins,
        },
      };
    } catch (error: any) {
      console.error('Transaction verification failed:', error);
      return {
        success: false,
        transactionId: '',
        reference,
        status: 'failed',
        message: 'Verification failed',
        metadata: {
          provider: 'vtu',
          error: error.message,
        },
      };
    }
  }

  /**
   * Purchase electricity
   */
  async purchaseElectricity(
    serviceId: string,
    customerId: string,
    variationId: 'prepaid' | 'postpaid',
    amount: number,
    requestId?: string
  ): Promise<TransactionResponse> {
    try {
      const payload = {
        request_id: requestId || this.generateRequestId('electricity'),
        customer_id: customerId,
        service_id: serviceId,
        variation_id: variationId,
        amount,
      };

      const response = await this.client.post<VTUOrderResponse>('/electricity', payload);
      
      return this.mapToTransactionResponse(response.data, 'electricity');
    } catch (error: any) {
      console.error('Electricity purchase failed:', error.response?.data || error.message);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Purchase cable TV subscription
   */
  async purchaseCableTV(
    serviceId: string,
    customerId: string,
    variationId: string,
    subscriptionType?: 'change' | 'renew',
    amount?: number,
    requestId?: string
  ): Promise<TransactionResponse> {
    try {
      const payload: any = {
        request_id: requestId || this.generateRequestId('tv'),
        customer_id: customerId,
        service_id: serviceId,
        variation_id: variationId,
      };

      if (subscriptionType) {
        payload.subscription_type = subscriptionType;
      }

      if (amount) {
        payload.amount = amount;
      }

      const response = await this.client.post<VTUOrderResponse>('/tv', payload);
      
      return this.mapToTransactionResponse(response.data, 'tv');
    } catch (error: any) {
      console.error('Cable TV purchase failed:', error.response?.data || error.message);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Fund betting account
   */
  async fundBetting(
    serviceId: string,
    customerId: string,
    amount: number,
    requestId?: string
  ): Promise<TransactionResponse> {
    try {
      const payload = {
        request_id: requestId || this.generateRequestId('betting'),
        customer_id: customerId,
        service_id: serviceId,
        amount,
      };

      const response = await this.client.post<VTUOrderResponse>('/betting', payload);
      
      return this.mapToTransactionResponse(response.data, 'betting');
    } catch (error: any) {
      console.error('Betting funding failed:', error.response?.data || error.message);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Purchase ePINs
   */
  async purchaseEpins(
    network: string,
    value: 100 | 200 | 500,
    quantity: number,
    requestId?: string
  ): Promise<TransactionResponse> {
    try {
      const serviceId = this.normalizeNetworkId(network);
      const payload = {
        request_id: requestId || this.generateRequestId('epins'),
        service_id: serviceId,
        value,
        quantity,
      };

      const response = await this.client.post<VTUOrderResponse>('/epins', payload);
      
      return this.mapToTransactionResponse(response.data, 'epins');
    } catch (error: any) {
      console.error('ePINs purchase failed:', error.response?.data || error.message);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Requery order status
   */
  async requeryOrder(requestId: string): Promise<VTURequeryResponse['data']> {
    try {
      const response = await this.client.post<VTURequeryResponse>('/requery', {
        request_id: requestId,
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Order requery failed:', error.response?.data || error.message);
      throw new Error('Failed to requery order');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const computed = crypto
      .createHmac('sha256', this.userPin)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computed)
    );
  }

  // Helper methods

  private normalizeNetworkId(network: string): string {
    const normalized = network.toLowerCase().trim();
    const mapping: Record<string, string> = {
      'mtn': 'mtn',
      'airtel': 'airtel',
      'glo': 'glo',
      'globacom': 'glo',
      '9mobile': '9mobile',
      'etisalat': '9mobile',
      'smile': 'smile',
    };
    return mapping[normalized] || normalized;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, and plus signs
    let cleaned = phone.replace(/[\s\-+]/g, '');
    
    // Convert 234 prefix to 0
    if (cleaned.startsWith('234')) {
      cleaned = '0' + cleaned.substring(3);
    }
    
    return cleaned;
  }

  private extractServiceId(network?: string): string {
    if (!network) return 'mtn';
    return this.normalizeNetworkId(network);
  }

  private determinePlanType(planName: string): 'sme' | 'gifting' | 'corporate' | 'direct' {
    const lower = planName.toLowerCase();
    if (lower.includes('sme')) return 'sme';
    if (lower.includes('gift')) return 'gifting';
    if (lower.includes('corporate')) return 'corporate';
    return 'direct';
  }

  private extractDataSize(planName: string): string {
    const match = planName.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)/i);
    return match ? `${match[1]}${match[2].toUpperCase()}` : 'Unknown';
  }

  private extractValidity(planName: string): string {
    const match = planName.match(/(\d+)\s*(Day|Days|Week|Weeks|Month|Months)/i);
    return match ? `${match[1]} ${match[2]}` : 'Unknown';
  }

  private mapToTransactionResponse(
    vtuResponse: VTUOrderResponse,
    type: string
  ): TransactionResponse {
    const isSuccessful = vtuResponse.data.status === 'completed-api';
    const isPending = vtuResponse.data.status.includes('processing') || 
                      vtuResponse.data.status.includes('initiated');
    const isRefunded = vtuResponse.data.status === 'refunded';

    return {
      success: isSuccessful,
      transactionId: vtuResponse.data.order_id.toString(),
      reference: vtuResponse.data.request_id,
      status: isSuccessful ? 'successful' : isPending ? 'processing' : isRefunded ? 'failed' : 'pending',
      message: vtuResponse.message,
      balance: parseFloat(vtuResponse.data.final_balance),
      token: vtuResponse.data.token,
      units: vtuResponse.data.units,
      metadata: {
        provider: 'vtu',
        service_name: vtuResponse.data.service_name,
        amount: vtuResponse.data.amount,
        amount_charged: vtuResponse.data.amount_charged,
        discount: vtuResponse.data.discount,
        phone: vtuResponse.data.phone,
        customer_id: vtuResponse.data.customer_id,
        customer_name: vtuResponse.data.customer_name,
        data_plan: vtuResponse.data.data_plan,
        variation_id: vtuResponse.data.variation_id,
        epins: vtuResponse.data.epins,
      },
    };
  }

  private handleTransactionError(error: any): TransactionResponse {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message || 'Transaction failed';
    const errorCode = errorData?.code || 'unknown_error';

    return {
      success: false,
      transactionId: '',
      reference: '',
      status: 'failed',
      message: errorMessage,
      metadata: {
        provider: 'vtu',
        error_code: errorCode,
        error_details: errorData,
      },
    };
  }
}

export default VTUProvider;
