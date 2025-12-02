/**
 * VendorAdapter Interface
 * Provides abstraction layer for different VTU service providers
 * Allows easy switching between providers without changing business logic
 */

export interface VendorResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  vendorReference?: string;
  message?: string;
}

export interface DataBundle {
  id: string;
  network: string;
  planType: string; // SME, GIFTING, CORPORATE, etc.
  size: string; // e.g., "1GB", "2GB"
  validity: string; // e.g., "30 Days"
  price: number;
  vendorPrice: number;
  name?: string;
  description?: string;
}

export interface PurchaseDataRequest {
  network: string;
  phoneNumber: string;
  planId: string;
  amount: number;
  reference: string;
}

export interface PurchaseAirtimeRequest {
  network: string;
  phoneNumber: string;
  amount: number;
  reference: string;
}

export interface ElectricityRequest {
  disco: string; // Distribution company
  meterNumber: string;
  meterType: 'PREPAID' | 'POSTPAID';
  amount: number;
  customerName?: string;
  customerAddress?: string;
  reference: string;
}

export interface CableTVRequest {
  provider: string; // DSTV, GOTV, STARTIMES, SHOWMAX
  smartCardNumber: string;
  plan: string;
  amount: number;
  customerName?: string;
  reference: string;
}

export interface VerifyMeterRequest {
  disco: string;
  meterNumber: string;
  meterType: 'PREPAID' | 'POSTPAID';
}

export interface VerifySmartCardRequest {
  provider: string;
  smartCardNumber: string;
}

export interface TransactionStatusRequest {
  reference: string;
}

/**
 * Base VendorAdapter interface
 * All vendor implementations must implement this interface
 */
export interface IVendorAdapter {
  // Data Services
  getDataBundles(network?: string): Promise<VendorResponse<DataBundle[]>>;
  purchaseData(request: PurchaseDataRequest): Promise<VendorResponse>;
  
  // Airtime Services
  purchaseAirtime(request: PurchaseAirtimeRequest): Promise<VendorResponse>;
  
  // Electricity Services
  verifyMeter(request: VerifyMeterRequest): Promise<VendorResponse>;
  purchaseElectricity(request: ElectricityRequest): Promise<VendorResponse>;
  
  // Cable TV Services
  getCablePlans(provider: string): Promise<VendorResponse<any[]>>;
  verifySmartCard(request: VerifySmartCardRequest): Promise<VendorResponse>;
  purchaseCableTV(request: CableTVRequest): Promise<VendorResponse>;
  
  // Transaction Status
  checkTransactionStatus(request: TransactionStatusRequest): Promise<VendorResponse>;
  
  // Wallet Balance (for some vendors)
  getVendorBalance?(): Promise<VendorResponse<{ balance: number }>>;
}

/**
 * Abstract base class with common functionality
 */
export abstract class BaseVendorAdapter implements IVendorAdapter {
  protected apiKey: string;
  protected baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  // Abstract methods - must be implemented by subclasses
  abstract getDataBundles(network?: string): Promise<VendorResponse<DataBundle[]>>;
  abstract purchaseData(request: PurchaseDataRequest): Promise<VendorResponse>;
  abstract purchaseAirtime(request: PurchaseAirtimeRequest): Promise<VendorResponse>;
  abstract verifyMeter(request: VerifyMeterRequest): Promise<VendorResponse>;
  abstract purchaseElectricity(request: ElectricityRequest): Promise<VendorResponse>;
  abstract getCablePlans(provider: string): Promise<VendorResponse<any[]>>;
  abstract verifySmartCard(request: VerifySmartCardRequest): Promise<VendorResponse>;
  abstract purchaseCableTV(request: CableTVRequest): Promise<VendorResponse>;
  abstract checkTransactionStatus(request: TransactionStatusRequest): Promise<VendorResponse>;

  /**
   * Common error handler
   */
  protected handleError(error: any): VendorResponse {
    console.error('Vendor API Error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Vendor service error',
      message: 'Failed to process request',
    };
  }

  /**
   * Common retry logic
   */
  protected async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        console.log(`Attempt ${attempt} failed, retrying...`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }
}
