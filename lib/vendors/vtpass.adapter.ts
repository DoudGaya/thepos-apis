/**
 * VTpass Vendor Adapter
 * 
 * Implementation of VendorAdapter interface for VTpass API
 * Documentation: https://vtpass.com/documentation
 * 
 * Supports: Airtime, Data, Electricity, Cable TV, Education, Insurance
 * Primary for: Airtime, Cable TV, Electricity
 */

import axios, { AxiosInstance } from 'axios'
import {
  VendorAdapter,
  VendorName,
  ServiceType,
  NetworkType,
  WalletBalance,
  ServicePlan,
  PurchasePayload,
  VendorPurchaseResponse,
  TransactionStatus,
  VerifyCustomerPayload,
  CustomerVerification,
  VendorTransactionStatus,
  VendorError,
} from './adapter.interface'
import { retry, vendorRetryOptions } from '../utils/retry'

// VTpass Service ID mappings
const VTPASS_SERVICE_IDS = {
  // Airtime
  AIRTIME: {
    MTN: 'mtn',
    GLO: 'glo',
    AIRTEL: 'airtel',
    '9MOBILE': 'etisalat',
    SMILE: 'smile-direct',
    FOREIGN: 'foreign-airtime',
  },
  // Data
  DATA: {
    MTN: 'mtn-data',
    GLO: 'glo-data',
    AIRTEL: 'airtel-data',
    '9MOBILE': 'etisalat-data',
    SMILE: 'smile-direct',
    SPECTRANET: 'spectranet',
    GLO_SME: 'glo-sme-data',
    '9MOBILE_SME': 'etisalat-sme-data',
  },
  // Cable TV
  CABLE_TV: {
    DSTV: 'dstv',
    GOTV: 'gotv',
    STARTIMES: 'startimes',
    SHOWMAX: 'showmax',
  },
  // Electricity
  ELECTRICITY: {
    'IKEJA': 'ikeja-electric',
    'EKO': 'eko-electric',
    'ABUJA': 'abuja-electric',
    'KANO': 'kano-electric',
    'PORTHARCOURT': 'portharcourt-electric',
    'JOS': 'jos-electric',
    'IBADAN': 'ibadan-electric',
    'KADUNA': 'kaduna-electric',
    'ENUGU': 'enugu-electric',
    'BENIN': 'benin-electric',
    'ABA': 'aba-electric',
    'YOLA': 'yola-electric',
  },
  // Education
  EDUCATION: {
    WAEC_RESULT: 'waec',
    WAEC_REG: 'waec-registration',
    JAMB: 'jamb',
  },
  // Other Services
  OTHER: {
    SMSCLONE: 'smsclone',
    TERMINAL: 'vtpass-terminal',
  }
} as const

// Response codes
const VTPASS_SUCCESS_CODES = ['000', '099']
const VTPASS_PENDING_CODES = ['099']

interface VTPassConfig {
  apiKey: string
  publicKey: string
  secretKey: string
  useSandbox?: boolean
}

/**
 * Generate VTpass-compliant request ID
 * Format: YYYYMMDDHHII + random alphanumeric (min 12 chars, first 12 numeric with today's date)
 * Timezone: Africa/Lagos (GMT+1)
 */
function generateRequestId(): string {
  // Use Intl.DateTimeFormat to get components in Africa/Lagos
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(new Date());

  const partMap: Record<string, string> = {};
  parts.forEach(part => {
    if (part.type !== 'literal') {
      partMap[part.type] = part.value;
    }
  });

  // Ensure year is 4 digits and others are 2 digits
  const year = partMap.year;
  const month = partMap.month.padStart(2, '0');
  const day = partMap.day.padStart(2, '0');
  const hour = partMap.hour.padStart(2, '0');
  const minute = partMap.minute.padStart(2, '0');

  const datePrefix = `${year}${month}${day}${hour}${minute}`;
  const randomSuffix = Math.random().toString(36).substring(2, 10);

  return `${datePrefix}${randomSuffix}`;
}

export class VTPassAdapter implements VendorAdapter {
  private apiKey: string
  private publicKey: string
  private secretKey: string
  private baseURL: string
  private client: AxiosInstance

  constructor(config: VTPassConfig | { apiKey: string, publicKey: string, secretKey: string, useSandbox?: boolean }) {
    this.apiKey = config.apiKey
    this.publicKey = config.publicKey
    this.secretKey = config.secretKey
    this.baseURL = config.useSandbox
      ? 'https://sandbox.vtpass.com/api'
      : 'https://vtpass.com/api'

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`[VTPass] Initialized with ${config.useSandbox ? 'SANDBOX' : 'LIVE'} environment`)
    console.log(`[VTPass] Base URL: ${this.baseURL}`)
    console.log(`[VTPass] API Key: ${this.apiKey.substring(0, 10)}...`)
  }

  getName(): VendorName {
    return 'VTPASS'
  }

  getSupportedServices(): ServiceType[] {
    return ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE_TV', 'CABLE', 'EPINS', 'EDUCATION']
  }

  // VTpass uses API keys, no session-based auth needed
  async authenticate(): Promise<void> {
    // Verify credentials by checking balance
    try {
      await this.getBalance()
      console.log('[VTPass] Authentication verified via balance check')
    } catch (error) {
      console.error('[VTPass] Authentication verification failed')
      throw error
    }
  }

  isAuthenticated(): boolean {
    return !!(this.apiKey && this.publicKey && this.secretKey)
  }

  /**
   * Get headers for GET requests (api-key + public-key)
   */
  private getGetHeaders() {
    return {
      'api-key': this.apiKey,
      'public-key': this.publicKey,
    }
  }

  /**
   * Get headers for POST requests (api-key + secret-key)
   */
  private getPostHeaders() {
    return {
      'api-key': this.apiKey,
      'secret-key': this.secretKey,
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    // Check for placeholder credentials to avoid API errors during development
    if (!this.apiKey || this.apiKey.includes('placeholder') || this.apiKey.includes('your-')) {
      console.warn('[VTPass] Using placeholder/missing credentials - returning simulated balance')
      return {
        balance: 50000.00,
        currency: 'NGN'
      }
    }

    try {
      console.log(`[VTPass] Fetching balance from: ${this.baseURL}/balance`)
      const response = await retry(
        () => this.client.get('/balance', {
          headers: this.getGetHeaders(),
        }),
        vendorRetryOptions
      )

      const data = response.data
      console.log(`[VTPass] Balance response:`, JSON.stringify(data, null, 2))
      
      if (data.code === 1 || data.code === '1') {
        const balance = parseFloat(data.contents.balance)
        console.log(`[VTPass] Parsed balance: ₦${balance}`)
        return {
          balance,
          currency: 'NGN',
        }
      }

      throw new VendorError(
        data.response_description || 'Failed to get balance',
        'VTPASS',
        400,
        data
      )
    } catch (error: any) {
      if (error instanceof VendorError) throw error
      console.error(`[VTPass] Balance check error:`, error.message)
      throw new VendorError(
        `VTPass balance check failed: ${error.message}`,
        'VTPASS',
        error.response?.status || 500,
        error.response?.data
      )
    }
  }

  /**
   * Get available service plans/variations
   */
  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    let serviceID: string | undefined

    if (service === 'AIRTIME') {
      // Airtime doesn't have variations, return empty
      return []
    }

    if (service === 'DATA' && network) {
      serviceID = VTPASS_SERVICE_IDS.DATA[network as keyof typeof VTPASS_SERVICE_IDS.DATA]
    } else if (service === 'CABLE_TV' || service === 'CABLE') {
      // Default to DSTV, caller should specify provider in metadata
      serviceID = 'dstv'
    }

    if (!serviceID) {
      return []
    }

    try {
      const response = await retry(
        () => this.client.get('/service-variations', {
          params: { serviceID },
          headers: this.getGetHeaders(),
        }),
        vendorRetryOptions
      )

      const data = response.data
      if (data.response_description !== '000') {
        console.warn(`[VTPass] getPlans warning: ${data.response_description}`)
        return []
      }

      const variations = data.content?.varations || data.content?.variations || []

      return variations.map((v: any) => ({
        id: v.variation_code,
        name: v.name,
        network: network || 'MTN',
        price: parseFloat(v.variation_amount),
        faceValue: parseFloat(v.variation_amount),
        validity: v.validity || '',
        isAvailable: true,
        metadata: {
          fixedPrice: v.fixedPrice,
          variationCode: v.variation_code,
        },
      }))
    } catch (error: any) {
      console.error(`[VTPass] getPlans error:`, error.message)
      return []
    }
  }

  /**
   * Verify customer for Cable TV or Electricity
   */
  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    let serviceID: string
    let endpoint: string

    if (payload.service === 'CABLE_TV' || payload.service === 'CABLE') {
      // Map provider to service ID
      const provider = payload.serviceProvider.toUpperCase()
      serviceID = VTPASS_SERVICE_IDS.CABLE_TV[provider as keyof typeof VTPASS_SERVICE_IDS.CABLE_TV] || 'dstv'
      endpoint = '/merchant-verify'
    } else if (payload.service === 'ELECTRICITY') {
      const provider = payload.serviceProvider.toUpperCase()
      serviceID = VTPASS_SERVICE_IDS.ELECTRICITY[provider as keyof typeof VTPASS_SERVICE_IDS.ELECTRICITY] || 'ikeja-electric'
      endpoint = '/merchant-verify'
    } else {
      return { isValid: false }
    }

    try {
      const requestBody: any = {
        billersCode: payload.customerId,
        serviceID,
      }

      // Add meter type for electricity
      if (payload.service === 'ELECTRICITY' && payload.meterType) {
        requestBody.type = payload.meterType.toLowerCase()
      }

      const response = await retry(
        () => this.client.post(endpoint, requestBody, {
          headers: this.getPostHeaders(),
        }),
        { ...vendorRetryOptions, maxRetries: 2 }
      )

      const data = response.data

      if (data.code === '000') {
        return {
          isValid: true,
          customerName: data.content?.Customer_Name || data.content?.customerName,
          address: data.content?.Address || data.content?.address,
          accountType: data.content?.Account_Type || data.content?.accountType,
          metadata: data.content,
        }
      }

      return {
        isValid: false,
        metadata: { error: data.response_description },
      }
    } catch (error: any) {
      console.error(`[VTPass] verifyCustomer error:`, error.message)
      return {
        isValid: false,
        metadata: { error: error.message },
      }
    }
  }

  /**
   * Purchase a service (implements buyService from interface)
   */
  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    return this.purchase(payload)
  }

  /**
   * Query transaction status (implements queryTransaction from interface)
   */
  async queryTransaction(reference: string | number): Promise<TransactionStatus> {
    return this.checkStatus(String(reference))
  }

  /**
   * Purchase a service
   */
  async purchase(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    // Check for placeholder credentials
    if (!this.apiKey || this.apiKey.includes('placeholder') || this.apiKey.includes('your-')) {
      console.warn('[VTPass] Using placeholder/missing credentials - returning simulated purchase success')
      return {
        success: true,
        status: 'COMPLETED',
        orderId: payload.idempotencyKey,
        vendorReference: `SIM-${Date.now()}`,
        vendorName: 'VTPASS',
        costPrice: payload.amount || 0,
        message: 'Simulated purchase successful',
        metadata: {
          simulated: true,
          requestId: `SIM-${Date.now()}`,
        },
      }
    }

    const requestId = generateRequestId()
    let serviceID: string
    let requestBody: any = {
      request_id: requestId,
      phone: payload.phone,
    }

    // Determine service ID and build request body based on service type
    if (payload.service === 'AIRTIME') {
      serviceID = VTPASS_SERVICE_IDS.AIRTIME[payload.network as keyof typeof VTPASS_SERVICE_IDS.AIRTIME]
      requestBody.serviceID = serviceID
      requestBody.amount = payload.amount
    } else if (payload.service === 'DATA') {
      serviceID = VTPASS_SERVICE_IDS.DATA[payload.network as keyof typeof VTPASS_SERVICE_IDS.DATA]
      requestBody.serviceID = serviceID
      requestBody.billersCode = payload.phone
      requestBody.variation_code = payload.planId
      requestBody.amount = payload.amount
    } else if (payload.service === 'CABLE_TV' || payload.service === 'CABLE') {
      const provider = (payload.metadata?.provider || 'DSTV').toUpperCase()
      serviceID = VTPASS_SERVICE_IDS.CABLE_TV[provider as keyof typeof VTPASS_SERVICE_IDS.CABLE_TV] || 'dstv'
      requestBody.serviceID = serviceID
      requestBody.billersCode = payload.customerId
      requestBody.variation_code = payload.planId
      requestBody.amount = payload.amount
      requestBody.subscription_type = payload.metadata?.subscriptionType || 'renew'
    } else if (payload.service === 'ELECTRICITY') {
      const provider = (payload.metadata?.provider || 'IKEJA').toUpperCase()
      serviceID = VTPASS_SERVICE_IDS.ELECTRICITY[provider as keyof typeof VTPASS_SERVICE_IDS.ELECTRICITY] || 'ikeja-electric'
      requestBody.serviceID = serviceID
      requestBody.billersCode = payload.customerId
      requestBody.variation_code = payload.meterType?.toLowerCase() || 'prepaid'
      requestBody.amount = payload.amount
    } else if (payload.service === 'EDUCATION' || payload.service === 'EPINS') {
      const examName = (payload.metadata?.examName || 'WAEC').toUpperCase()
      serviceID = VTPASS_SERVICE_IDS.EDUCATION[examName as keyof typeof VTPASS_SERVICE_IDS.EDUCATION] || 'waec'
      requestBody.serviceID = serviceID
      requestBody.variation_code = payload.planId
      requestBody.amount = payload.amount
      // Some education services need specific phone or details
      if (examName === 'JAMB') {
        requestBody.billersCode = payload.customerId // Profile Code
      } else {
        requestBody.billersCode = payload.phone
      }
    } else {
      // Check if it's one of the "OTHER" services
      const otherKey = (payload.metadata?.otherProvider || '').toUpperCase()
      serviceID = VTPASS_SERVICE_IDS.OTHER[otherKey as keyof typeof VTPASS_SERVICE_IDS.OTHER]

      if (serviceID) {
        requestBody.serviceID = serviceID
        requestBody.amount = payload.amount
        requestBody.billersCode = payload.customerId || payload.phone
      } else {
        throw new VendorError(
          `Unsupported service type or provider: ${payload.service}`,
          'VTPASS',
          400,
          null
        )
      }
    }

    console.log(`[VTPass] Purchase request:`, { serviceID, requestId, service: payload.service })
    console.log(`[VTPass] Using API Key: ${this.apiKey ? this.apiKey.substring(0, 4) + '...' : 'MISSING'}`)

    try {
      const response = await retry(
        () => this.client.post('/pay', requestBody, {
          headers: this.getPostHeaders(),
        }),
        { ...vendorRetryOptions, maxRetries: 1 } // Only 1 retry for purchases
      )

      const data = response.data
      console.log(`[VTPass] Purchase response:`, data)

      // Map VTpass status to our status
      let status: VendorTransactionStatus
      if (data.code === '000' && data.content?.transactions?.status === 'delivered') {
        status = 'COMPLETED'
      } else if (VTPASS_PENDING_CODES.includes(data.code) || data.content?.transactions?.status === 'pending') {
        status = 'PENDING'
      } else {
        // Check for specific error codes
        if (data.code === '028') {
          console.error('[VTPass] Error 028: Product not whitelisted. You might be using a LIVE account in SANDBOX mode, or vice versa. Please check your VTPASS_USE_SANDBOX setting.')
        }
        status = 'FAILED'
      }

      return {
        success: status === 'COMPLETED',
        status,
        orderId: payload.idempotencyKey,
        vendorReference: requestId,
        vendorName: 'VTPASS',
        costPrice: parseFloat(data.content?.transactions?.total_amount || payload.amount?.toString() || '0'),
        message: data.response_description || data.content?.transactions?.status || 'Unknown',
        metadata: {
          requestId,
          transactionId: data.content?.transactions?.transactionId,
          productName: data.content?.transactions?.product_name,
          token: data.purchased_code, // For electricity tokens
          ...data.content,
        },
      }
    } catch (error: any) {
      console.error(`[VTPass] Purchase error:`, error.message)

      // For purchase errors, we should return a failed response, not throw
      return {
        success: false,
        status: 'FAILED',
        orderId: payload.idempotencyKey,
        vendorReference: requestId,
        vendorName: 'VTPASS',
        costPrice: 0,
        message: error.response?.data?.response_description || error.message,
        metadata: {
          requestId,
          error: error.response?.data || error.message,
        },
      }
    }
  }

  /**
   * Check transaction status (requery)
   */
  async checkStatus(vendorReference: string): Promise<TransactionStatus> {
    try {
      const response = await retry(
        () => this.client.post('/requery', {
          request_id: vendorReference,
        }, {
          headers: this.getPostHeaders(),
        }),
        vendorRetryOptions
      )

      const data = response.data

      let status: VendorTransactionStatus
      const txStatus = data.content?.transactions?.status?.toLowerCase()

      if (txStatus === 'delivered' || data.response_description === 'TRANSACTION SUCCESSFUL') {
        status = 'COMPLETED'
      } else if (txStatus === 'pending') {
        status = 'PENDING'
      } else if (txStatus === 'failed' || txStatus === 'reversed') {
        status = txStatus === 'reversed' ? 'REFUNDED' : 'FAILED'
      } else {
        status = 'PENDING'
      }

      return {
        status,
        reference: vendorReference,
        message: data.response_description || txStatus,
        metadata: data.content,
      }
    } catch (error: any) {
      console.error(`[VTPass] checkStatus error:`, error.message)
      return {
        status: 'PENDING',
        reference: vendorReference,
        message: `Status check failed: ${error.message}`,
      }
    }
  }

  /**
   * Get available service categories
   */
  async getServiceCategories(): Promise<any[]> {
    try {
      const response = await this.client.get('/service-categories', {
        headers: this.getGetHeaders(),
      })
      return response.data.content || []
    } catch (error) {
      console.error('[VTPass] getServiceCategories error:', error)
      return []
    }
  }

  /**
   * Get services by category identifier
   */
  async getServices(identifier: string): Promise<any[]> {
    try {
      const response = await this.client.get('/services', {
        params: { identifier },
        headers: this.getGetHeaders(),
      })
      return response.data.content || []
    } catch (error) {
      console.error('[VTPass] getServices error:', error)
      return []
    }
  }

  /**
   * Get electricity providers with verification
   */
  async getElectricityProviders(): Promise<any[]> {
    return Object.entries(VTPASS_SERVICE_IDS.ELECTRICITY).map(([name, serviceId]) => ({
      name,
      serviceId,
      supportsPrepaid: true,
      supportsPostpaid: true,
    }))
  }

  /**
   * Get cable TV providers with their bouquets
   */
  async getCableTVProviders(): Promise<any[]> {
    return Object.entries(VTPASS_SERVICE_IDS.CABLE_TV).map(([name, serviceId]) => ({
      name,
      serviceId,
    }))
  }

}
