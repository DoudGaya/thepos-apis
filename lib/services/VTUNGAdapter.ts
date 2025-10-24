/**
 * VTU.NG Adapter Implementation
 * Official implementation for VTU.NG API v2
 * Documentation: https://vtu.ng/documentation
 */

import axios, { AxiosInstance } from 'axios';
import {
  BaseVendorAdapter,
  VendorResponse,
  DataBundle,
  PurchaseDataRequest,
  PurchaseAirtimeRequest,
  ElectricityRequest,
  CableTVRequest,
  VerifyMeterRequest,
  VerifySmartCardRequest,
  TransactionStatusRequest,
} from './VendorAdapter';

interface VTUNGConfig {
  apiKey: string;
  baseUrl?: string;
  username?: string;
  password?: string;
}

export class VTUNGAdapter extends BaseVendorAdapter {
  private client: AxiosInstance;
  private username?: string;
  private password?: string;

  constructor(config: VTUNGConfig) {
    super(
      config.apiKey,
      config.baseUrl || 'https://vtu.ng/wp-json/api/v1'
    );

    this.username = config.username;
    this.password = config.password;

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 30000, // 30 seconds
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      if (this.username && this.password) {
        config.auth = {
          username: this.username,
          password: this.password,
        };
      }
      return config;
    });
  }

  /**
   * Get data bundles for specific network or all networks
   */
  async getDataBundles(network?: string): Promise<VendorResponse<DataBundle[]>> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.get('/data', {
          params: network ? { network } : undefined,
        });
      });

      if (response.data?.success === false) {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch data bundles',
        };
      }

      const bundles: DataBundle[] = (response.data?.data || []).map((item: any) => ({
        id: item.variation_code || item.id,
        network: item.network || network || 'UNKNOWN',
        planType: item.plan_type || item.type || 'SME',
        size: item.size || item.name,
        validity: item.validity || item.month_validate || '30 Days',
        price: parseFloat(item.price) || 0,
        vendorPrice: parseFloat(item.variation_amount) || parseFloat(item.price) || 0,
        name: item.name,
        description: item.description,
      }));

      return {
        success: true,
        data: bundles,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Purchase data bundle
   */
  async purchaseData(request: PurchaseDataRequest): Promise<VendorResponse> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.post('/data', {
          network: request.network.toUpperCase(),
          phone: request.phoneNumber,
          plan: request.planId,
          request_id: request.reference,
        });
      }, 2); // Only 2 retries for purchases

      if (response.data?.code === 'success' || response.data?.success === true) {
        return {
          success: true,
          data: response.data,
          vendorReference: response.data?.data?.request_id || request.reference,
          message: response.data?.message || 'Data purchase successful',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Data purchase failed',
        vendorReference: request.reference,
      };
    } catch (error: any) {
      // Check if it's a duplicate transaction error
      if (error.response?.data?.message?.includes('duplicate')) {
        return {
          success: false,
          error: 'Duplicate transaction',
          message: 'This transaction has already been processed',
        };
      }
      return this.handleError(error);
    }
  }

  /**
   * Purchase airtime
   */
  async purchaseAirtime(request: PurchaseAirtimeRequest): Promise<VendorResponse> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.post('/airtime', {
          network: request.network.toUpperCase(),
          phone: request.phoneNumber,
          amount: request.amount,
          request_id: request.reference,
        });
      }, 2);

      if (response.data?.code === 'success' || response.data?.success === true) {
        return {
          success: true,
          data: response.data,
          vendorReference: response.data?.data?.request_id || request.reference,
          message: response.data?.message || 'Airtime purchase successful',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Airtime purchase failed',
        vendorReference: request.reference,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Verify electricity meter
   */
  async verifyMeter(request: VerifyMeterRequest): Promise<VendorResponse> {
    try {
      const response = await this.client.post('/electricity/verify', {
        disco: request.disco.toUpperCase(),
        meter_number: request.meterNumber,
        type: request.meterType,
      });

      if (response.data?.success === true) {
        return {
          success: true,
          data: {
            customerName: response.data?.data?.customer_name,
            customerAddress: response.data?.data?.address,
            meterNumber: request.meterNumber,
          },
          message: 'Meter verified successfully',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Meter verification failed',
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Purchase electricity
   */
  async purchaseElectricity(request: ElectricityRequest): Promise<VendorResponse> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.post('/electricity', {
          disco: request.disco.toUpperCase(),
          meter_number: request.meterNumber,
          type: request.meterType,
          amount: request.amount,
          request_id: request.reference,
        });
      }, 2);

      if (response.data?.code === 'success' || response.data?.success === true) {
        return {
          success: true,
          data: {
            token: response.data?.data?.token,
            units: response.data?.data?.units,
            customerName: response.data?.data?.customer_name,
          },
          vendorReference: response.data?.data?.request_id || request.reference,
          message: response.data?.message || 'Electricity purchase successful',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Electricity purchase failed',
        vendorReference: request.reference,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Verify cable TV smart card
   */
  async verifySmartCard(request: VerifySmartCardRequest): Promise<VendorResponse> {
    try {
      const response = await this.client.post('/tv/verify', {
        service: request.provider.toUpperCase(),
        smartcard: request.smartCardNumber,
      });

      if (response.data?.success === true) {
        return {
          success: true,
          data: {
            customerName: response.data?.data?.customer_name,
            currentBouquet: response.data?.data?.current_bouquet,
            renewalAmount: response.data?.data?.renewal_amount,
            dueDate: response.data?.data?.due_date,
          },
          message: 'Smart card verified successfully',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Smart card verification failed',
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Purchase cable TV subscription
   */
  async purchaseCableTV(request: CableTVRequest): Promise<VendorResponse> {
    try {
      const response = await this.retryRequest(async () => {
        return await this.client.post('/tv', {
          service: request.provider.toUpperCase(),
          smartcard: request.smartCardNumber,
          plan: request.plan,
          request_id: request.reference,
        });
      }, 2);

      if (response.data?.code === 'success' || response.data?.success === true) {
        return {
          success: true,
          data: response.data?.data,
          vendorReference: response.data?.data?.request_id || request.reference,
          message: response.data?.message || 'Cable TV subscription successful',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Cable TV subscription failed',
        vendorReference: request.reference,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(request: TransactionStatusRequest): Promise<VendorResponse> {
    try {
      const response = await this.client.get('/transaction', {
        params: {
          request_id: request.reference,
        },
      });

      if (response.data?.success === true) {
        return {
          success: true,
          data: {
            status: response.data?.data?.status,
            reference: response.data?.data?.request_id,
            amount: response.data?.data?.amount,
            createdAt: response.data?.data?.created_at,
          },
          message: 'Transaction status retrieved',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to get transaction status',
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get VTU.NG wallet balance
   */
  async getVendorBalance(): Promise<VendorResponse<{ balance: number }>> {
    try {
      const response = await this.client.get('/balance');

      if (response.data?.success === true) {
        return {
          success: true,
          data: {
            balance: parseFloat(response.data?.data?.balance) || 0,
          },
          message: 'Balance retrieved successfully',
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to get balance',
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export singleton instance
export const vtuNGAdapter = new VTUNGAdapter({
  apiKey: process.env.VTU_NG_API_KEY || '',
  username: process.env.VTU_NG_USERNAME,
  password: process.env.VTU_NG_PASSWORD,
});
