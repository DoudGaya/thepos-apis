/**
 * PayGold API Provider Implementation
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

export class PayGoldProvider extends BaseProvider {
  constructor() {
    const config: ServiceProvider = {
      id: 'paygold',
      name: 'PayGold',
      type: 'data',
      isActive: true,
      priority: 2,
      baseUrl: process.env.PAYGOLD_BASE_URL || 'https://paygold.ng/api/v1',
      credentials: {
        apiKey: process.env.PAYGOLD_API_KEY,
        secretKey: process.env.PAYGOLD_SECRET_KEY,
      },
    };

    super(config);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      await this.makeRequest('/user/profile', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'X-API-Key': this.credentials.secretKey,
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
      const response = await this.makeRequest('/services/data', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'X-API-Key': this.credentials.secretKey,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch data plans');
      }

      return response.data.map((plan: any) => ({
        id: plan.plan_id.toString(),
        networkId: plan.network_id.toString(),
        network: plan.network_name,
        planType: plan.plan_type || 'corporate',
        name: plan.plan_name,
        size: plan.data_size,
        validity: plan.validity_period,
        price: parseFloat(plan.selling_price),
        originalPrice: parseFloat(plan.amount),
        commission: this.calculateCommission(parseFloat(plan.selling_price), 4), // 4% commission
        isActive: plan.status === 'active',
      }));
    } catch (error) {
      console.error(`${this.name} getDataPlans error:`, error);
      throw new Error(`Failed to fetch data plans from ${this.name}`);
    }
  }

  async getBillServices(): Promise<BillService[]> {
    try {
      const response = await this.makeRequest('/services/bills', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'X-API-Key': this.credentials.secretKey,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch bill services');
      }

      return response.data.map((service: any) => ({
        id: service.service_id.toString(),
        billerId: service.biller_code,
        name: service.service_name,
        category: this.mapCategory(service.category),
        type: service.service_type || 'prepaid',
        commission: 3, // 3% commission for bills
        isActive: service.status === 'active',
        fields: this.mapServiceFields(service.required_fields || []),
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
        request_id: transactionId,
        amount: request.amount,
      };

      switch (request.type) {
        case 'data':
          endpoint = '/transactions/data';
          payload = {
            ...payload,
            plan_id: request.planId,
            phone_number: request.customerInfo.phone,
          };
          break;

        case 'bills':
        case 'electricity':
        case 'cable':
          endpoint = '/transactions/bills';
          payload = {
            ...payload,
            service_id: request.billerId,
            customer_id: request.customerInfo.meterNumber || request.customerInfo.accountNumber,
            customer_phone: request.customerInfo.phone,
          };
          break;

        default:
          throw new Error(`Unsupported transaction type: ${request.type}`);
      }

      const response = await this.makeRequest(endpoint, 'POST', payload, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'X-API-Key': this.credentials.secretKey,
        'Content-Type': 'application/json',
      });

      if (!response.success) {
        throw new Error(response.message || 'Transaction failed');
      }

      return {
        success: true,
        transactionId,
        reference: response.data.reference || transactionId,
        status: this.mapTransactionStatus(response.data.status),
        message: response.message || 'Transaction processed successfully',
        balance: response.data.wallet_balance,
        token: response.data.token,
        units: response.data.units,
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
      const response = await this.makeRequest(`/transactions/verify`, 'POST', {
        reference: reference,
      }, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'X-API-Key': this.credentials.secretKey,
        'Content-Type': 'application/json',
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to verify transaction');
      }

      const transaction = response.data;

      return {
        success: transaction.status === 'successful',
        transactionId: transaction.transaction_id || reference,
        reference: transaction.reference || reference,
        status: this.mapTransactionStatus(transaction.status),
        message: response.message || 'Transaction verified',
        balance: transaction.wallet_balance,
        token: transaction.token,
        units: transaction.units,
        metadata: transaction || {},
      };
    } catch (error) {
      console.error(`${this.name} verifyTransaction error:`, error);
      throw new Error(`Failed to verify transaction with ${this.name}`);
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await this.makeRequest('/user/wallet', 'GET', null, {
        'Authorization': `Bearer ${this.credentials.apiKey}`,
        'X-API-Key': this.credentials.secretKey,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to get balance');
      }

      return parseFloat(response.data.balance || '0');
    } catch (error) {
      console.error(`${this.name} getBalance error:`, error);
      throw new Error(`Failed to get balance from ${this.name}`);
    }
  }

  private mapCategory(category: string): 'electricity' | 'cable' | 'internet' | 'water' | 'waste' {
    const categoryMap: Record<string, 'electricity' | 'cable' | 'internet' | 'water' | 'waste'> = {
      'electricity': 'electricity',
      'power': 'electricity',
      'cable_tv': 'cable',
      'cable': 'cable',
      'tv': 'cable',
      'internet': 'internet',
      'broadband': 'internet',
      'water': 'water',
      'waste': 'waste',
    };

    return categoryMap[category.toLowerCase()] || 'electricity';
  }

  private mapTransactionStatus(status: string): 'pending' | 'successful' | 'failed' | 'processing' {
    const statusMap: Record<string, 'pending' | 'successful' | 'failed' | 'processing'> = {
      'successful': 'successful',
      'success': 'successful',
      'completed': 'successful',
      'pending': 'pending',
      'processing': 'processing',
      'failed': 'failed',
      'error': 'failed',
      'cancelled': 'failed',
      'declined': 'failed',
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }

  private mapServiceFields(fields: any[]): BillField[] {
    return fields.map((field: any) => ({
      name: field.field_name,
      type: field.field_type || 'text',
      label: field.field_label || field.field_name,
      required: field.is_required || false,
      validation: field.validation_rule,
      options: field.field_options || [],
    }));
  }
}
