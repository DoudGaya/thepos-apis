/**
 * Provider service interfaces and types
 */

export interface ServiceProvider {
  id: string;
  name: string;
  type: 'data' | 'bills' | 'electricity' | 'cable' | 'internet';
  isActive: boolean;
  priority: number; // Lower number = higher priority
  healthCheckUrl?: string;
  baseUrl: string;
  credentials: {
    apiKey?: string;
    secretKey?: string;
    username?: string;
    password?: string;
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
}

export interface BillService {
  id: string;
  billerId: string;
  name: string;
  category: 'electricity' | 'cable' | 'internet' | 'water' | 'waste';
  type: 'prepaid' | 'postpaid';
  commission: number;
  isActive: boolean;
  fields: BillField[];
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
  type: 'data' | 'bills' | 'electricity' | 'cable';
  amount: number;
  customerInfo: {
    phone?: string;
    meterNumber?: string;
    cardNumber?: string;
    accountNumber?: string;
    email?: string;
    name?: string;
  };
  planId?: string;
  billerId?: string;
  metadata?: Record<string, any>;
}

export interface TransactionResponse {
  success: boolean;
  transactionId: string;
  reference: string;
  status: 'pending' | 'successful' | 'failed' | 'processing';
  message: string;
  balance?: number;
  token?: string;
  units?: string;
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
      'User-Agent': 'ThePOS/1.0',
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
