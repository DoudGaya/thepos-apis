/**
 * Provider service interfaces and types
 */

export interface ServiceProvider {
  id: string;
  name: string;
  type: 'data' | 'bills' | 'electricity' | 'cable' | 'internet' | 'multi';
  isActive: boolean;
  priority: number; // Lower number = higher priority
  healthCheckUrl?: string;
  baseUrl: string;
  credentials: {
    apiKey?: string;
    secretKey?: string;
    username?: string;
    password?: string;
    pin?: string; // For VTU.NG webhook verification
  };
}

export interface DataPlan {
  id: string;
  networkId: string;
  network: string;
  planType: 'sme' | 'gifting' | 'corporate' | 'direct';
  name: string;
  size: string;
  validity: string;
  price: number;
  originalPrice?: number;
  commission?: number;
  isActive: boolean;
  providerId?: string; // Provider that offers this plan
  variationId?: string; // Provider-specific variation ID (e.g., VTU.NG variation_id)
}

export interface BillService {
  id: string;
  billerId: string;
  name: string;
  category: 'electricity' | 'cable' | 'internet' | 'water' | 'waste' | 'betting';
  type: 'prepaid' | 'postpaid';
  commission: number;
  isActive: boolean;
  fields: BillField[];
  providerId?: string; // Provider that offers this service
}

export interface BillField {
  name: string;
  type: 'text' | 'number' | 'select';
  label: string;
  required: boolean;
  validation?: string;
  options?: { value: string; label: string }[];
}

export interface TransactionRequest {
  id: string;
  type: 'data' | 'bills' | 'electricity' | 'cable' | 'airtime' | 'betting' | 'epins';
  amount: number;
  customerInfo: {
    phone?: string;
    meterNumber?: string;
    cardNumber?: string;
    accountNumber?: string;
    email?: string;
    name?: string;
    customerId?: string; // For electricity/cable/betting
  };
  planId?: string;
  billerId?: string;
  variationId?: string; // For VTU.NG specific variations
  subscriptionType?: 'change' | 'renew'; // For cable TV
  network?: string; // For airtime/data
  value?: 100 | 200 | 500; // For ePINs
  quantity?: number; // For ePINs
  metadata?: Record<string, any>;
}

export interface TransactionResponse {
  success: boolean;
  transactionId: string;
  reference: string;
  status: 'pending' | 'successful' | 'failed' | 'processing';
  message: string;
  balance?: number;
  token?: string; // For electricity tokens
  units?: string; // For electricity units
  epins?: Array<{ // For ePINs
    amount: string;
    pin: string;
    serial: string;
    instruction: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ProviderHealth {
  provider: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime?: number;
  lastChecked: Date;
  errorRate?: number;
}

export interface PricingComparison {
  planId: string;
  providers: {
    provider: string;
    price: number;
    commission: number;
    profit: number;
    availability: boolean;
    responseTime: number;
  }[];
  recommended: string;
}

export abstract class BaseProvider {
  protected config: ServiceProvider;
  protected name: string;
  protected baseUrl: string;
  protected credentials: any;

  constructor(config: ServiceProvider) {
    this.config = config;
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.credentials = config.credentials;
  }

  abstract healthCheck(): Promise<ProviderHealth>;
  abstract getDataPlans(): Promise<DataPlan[]>;
  abstract getBillServices(): Promise<BillService[]>;
  abstract processTransaction(request: TransactionRequest): Promise<TransactionResponse>;
  abstract verifyTransaction(reference: string): Promise<TransactionResponse>;
  abstract getBalance(): Promise<number>;

  protected async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'NillarPay/1.0',
      ...headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`${this.name} API Error:`, error);
      throw error;
    }
  }

  protected generateTransactionId(): string {
    return `${this.config.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  protected calculateCommission(amount: number, rate: number): number {
    return Math.round((amount * rate) / 100);
  }
}

export interface ProviderServiceConfig {
  providers: ServiceProvider[];
  defaultCommissionRate: number;
  healthCheckInterval: number;
  maxRetries: number;
  fallbackProvider?: string;
  enableLoadBalancing: boolean;
  enablePriceComparison: boolean;
}

// VTU.NG Specific Types
export interface VTUCustomerVerification {
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
  district?: string;
  service_band?: string;
  business_unit?: string;
  customer_account_type?: string;
}

export interface AirtimeRequest {
  phone: string;
  network: 'mtn' | 'airtel' | 'glo' | '9mobile';
  amount: number;
  requestId?: string;
}

export interface EPINRequest {
  network: 'mtn' | 'airtel' | 'glo' | '9mobile';
  value: 100 | 200 | 500;
  quantity: number;
  requestId?: string;
}

export interface ElectricityRequest {
  serviceId: string;
  customerId: string;
  variationId: 'prepaid' | 'postpaid';
  amount: number;
  requestId?: string;
}

export interface CableTVRequest {
  serviceId: 'dstv' | 'gotv' | 'startimes' | 'showmax';
  customerId: string;
  variationId: string;
  subscriptionType?: 'change' | 'renew';
  amount?: number;
  requestId?: string;
}

export interface BettingRequest {
  serviceId: string;
  customerId: string;
  amount: number;
  requestId?: string;
}

// Betting Service IDs supported by VTU.NG
export type BettingServiceId = 
  | '1xBet' 
  | 'BangBet' 
  | 'Bet9ja' 
  | 'BetKing' 
  | 'BetLand' 
  | 'BetLion' 
  | 'BetWay' 
  | 'CloudBet' 
  | 'LiveScoreBet' 
  | 'MerryBet' 
  | 'NaijaBet' 
  | 'NairaBet' 
  | 'SupaBet';

// Electricity Service IDs supported by VTU.NG
export type ElectricityServiceId =
  | 'ikeja-electric'
  | 'eko-electric'
  | 'kano-electric'
  | 'portharcourt-electric'
  | 'jos-electric'
  | 'ibadan-electric'
  | 'kaduna-electric'
  | 'abuja-electric'
  | 'enugu-electric'
  | 'benin-electric'
  | 'aba-electric'
  | 'yola-electric';

