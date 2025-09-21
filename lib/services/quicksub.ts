/**
 * QuickSub API Provider Implementation
 */
import { 
  BaseProvider, 
  ServiceProvider, 
  DataPlan, 
  BillService, 
  TransactionRequest, 
  TransactionResponse, 
  ProviderHealth,
  BillField 
} from './types';

export class QuickSubProvider extends BaseProvider {
  constructor() {
    const config: ServiceProvider = {
      id: 'quicksub',
      name: 'QuickSub',
      type: 'data',
      isActive: true,
      priority: 1,
      baseUrl: process.env.QUICKSUB_BASE_URL || 'https://quicksub.ng/api',
      credentials: {
        apiKey: process.env.QUICKSUB_API_KEY,
        username: process.env.QUICKSUB_USERNAME,
        password: process.env.QUICKSUB_PASSWORD,
      },
    };

    super(config);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      await this.makeRequest('/balance', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
      });

      return {
        provider: this.name,
        status: 'online',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        errorRate: 0,
      };
    } catch (error) {
      console.error(`${this.name} health check failed:`, error);
      return {
        provider: this.name,
        status: 'offline',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        errorRate: 100,
      };
    }
  }

  async getDataPlans(): Promise<DataPlan[]> {
    try {
      const response = await this.makeRequest('/data-plans', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
      });

      return response.data.map((plan: any) => ({
        id: plan.id.toString(),
        networkId: plan.network_id.toString(),
        network: plan.network,
        planType: 'sme' as const,
        name: plan.name,
        size: plan.size,
        validity: plan.validity,
        price: parseFloat(plan.price),
        originalPrice: parseFloat(plan.original_price || plan.price),
        commission: this.calculateCommission(parseFloat(plan.price), 5), // 5% commission
        isActive: plan.status === 'active',
      }));
    } catch (error) {
      console.error(`${this.name} getDataPlans error:`, error);
      throw new Error(`Failed to fetch data plans from ${this.name}`);
    }
  }

  async getBillServices(): Promise<BillService[]> {
    try {
      const response = await this.makeRequest('/billers', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
      });

      return response.data.map((biller: any) => ({
        id: biller.id.toString(),
        billerId: biller.biller_id,
        name: biller.name,
        category: this.mapCategory(biller.category),
        type: biller.type || 'prepaid',
        commission: 2, // 2% commission for bills
        isActive: biller.status === 'active',
        fields: this.mapBillerFields(biller.fields || []),
      }));
    } catch (error) {
      console.error(`${this.name} getBillServices error:`, error);
      throw new Error(`Failed to fetch bill services from ${this.name}`);
    }
  }

  async processTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      const transactionId = this.generateTransactionId();
      
      let endpoint = '';
      let payload: any = {
        reference: transactionId,
        amount: request.amount,
      };

      switch (request.type) {
        case 'data':
          endpoint = '/data/purchase';
          payload = {
            ...payload,
            plan_id: request.planId,
            phone: request.customerInfo.phone,
          };
          break;

        case 'bills':
        case 'electricity':
          endpoint = '/bills/pay';
          payload = {
            ...payload,
            biller_id: request.billerId,
            customer_id: request.customerInfo.meterNumber || request.customerInfo.accountNumber,
            customer_name: request.customerInfo.name,
          };
          break;

        default:
          throw new Error(`Unsupported transaction type: ${request.type}`);
      }

      const response = await this.makeRequest(endpoint, 'POST', payload, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'Content-Type': 'application/json',
      });

      return {
        success: response.status === 'success',
        transactionId,
        reference: response.reference || transactionId,
        status: this.mapTransactionStatus(response.status),
        message: response.message || 'Transaction processed',
        balance: response.balance,
        token: response.token,
        units: response.units,
        metadata: response.data || {},
      };
    } catch (error) {
      console.error(`${this.name} processTransaction error:`, error);
      
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        reference: request.id,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  async verifyTransaction(reference: string): Promise<TransactionResponse> {
    try {
      const response = await this.makeRequest(`/transaction/verify/${reference}`, 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
      });

      return {
        success: response.status === 'success',
        transactionId: response.transaction_id || reference,
        reference: response.reference || reference,
        status: this.mapTransactionStatus(response.status),
        message: response.message || 'Transaction verified',
        balance: response.balance,
        token: response.token,
        units: response.units,
        metadata: response.data || {},
      };
    } catch (error) {
      console.error(`${this.name} verifyTransaction error:`, error);
      throw new Error(`Failed to verify transaction with ${this.name}`);
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await this.makeRequest('/balance', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
      });

      return parseFloat(response.balance || '0');
    } catch (error) {
      console.error(`${this.name} getBalance error:`, error);
      throw new Error(`Failed to get balance from ${this.name}`);
    }
  }

  private mapCategory(category: string): 'electricity' | 'cable' | 'internet' | 'water' | 'waste' {
    const categoryMap: Record<string, 'electricity' | 'cable' | 'internet' | 'water' | 'waste'> = {
      'power': 'electricity',
      'electricity': 'electricity',
      'cable': 'cable',
      'tv': 'cable',
      'internet': 'internet',
      'data': 'internet',
      'water': 'water',
      'waste': 'waste',
    };

    return categoryMap[category.toLowerCase()] || 'electricity';
  }

  private mapTransactionStatus(status: string): 'pending' | 'successful' | 'failed' | 'processing' {
    const statusMap: Record<string, 'pending' | 'successful' | 'failed' | 'processing'> = {
      'success': 'successful',
      'successful': 'successful',
      'completed': 'successful',
      'pending': 'pending',
      'processing': 'processing',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'failed',
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  private mapBillerFields(fields: any[]): BillField[] {
    return fields.map(field => ({
      name: field.name,
      type: field.type || 'text',
      label: field.label || field.name,
      required: field.required || false,
      validation: field.validation,
      options: field.options || [],
    }));
  }
}
