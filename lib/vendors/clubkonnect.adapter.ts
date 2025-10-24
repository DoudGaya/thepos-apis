/**
 * ClubKonnect Vendor Adapter
 * 
 * Implementation of VendorAdapter interface for ClubKonnect API
 * Base URL: https://www.nellobytesystems.com
 * Auth: URL Parameters (UserID + APIKey)
 * 
 * NOTE: ClubKonnect uses GET-based API (unusual for purchase APIs)
 * Only supports AIRTIME and DATA (no electricity, cable, betting, ePINs)
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
import { normalizePhone } from '../utils/phone-normalizer'

/**
 * ClubKonnect network codes
 */
const NETWORK_CODES: Record<string, string> = {
  MTN: '01',
  GLO: '02',
  '9MOBILE': '03',
  AIRTEL: '04',
}

export class ClubKonnectAdapter implements VendorAdapter {
  private baseURL = 'https://www.nellobytesystems.com'
  private client: AxiosInstance

  constructor(
    private userId: string,
    private apiKey: string
  ) {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
    })
  }

  getName(): VendorName {
    return 'CLUBKONNECT'
  }

  getSupportedServices(): ServiceType[] {
    // ClubKonnect only supports airtime and data
    return ['AIRTIME', 'DATA']
  }

  /**
   * ClubKonnect uses URL parameter authentication, no separate auth call needed
   */
  async authenticate(): Promise<void> {
    // No authentication endpoint - credentials are passed in URL params
    // Just validate that credentials exist
    if (!this.userId || !this.apiKey) {
      throw new VendorError(
        'ClubKonnect credentials not configured',
        'CLUBKONNECT',
        401,
        null
      )
    }
  }

  isAuthenticated(): boolean {
    return !!this.userId && !!this.apiKey
  }

  /**
   * Get base URL parameters with credentials
   */
  private getAuthParams(): string {
    return `UserID=${this.userId}&APIKey=${this.apiKey}`
  }

  /**
   * Get network code for ClubKonnect
   */
  private getNetworkCode(network: NetworkType): string {
    const code = NETWORK_CODES[network]
    if (!code) {
      throw new Error(`Unsupported network: ${network}`)
    }
    return code
  }

  /**
   * Get vendor wallet balance
   * Note: ClubKonnect returns balance in transaction responses, not separate endpoint
   */
  async getBalance(): Promise<WalletBalance> {
    // ClubKonnect doesn't have a dedicated balance endpoint
    // We can get balance from any transaction query
    // For now, we'll throw an error or query a dummy transaction
    throw new Error('ClubKonnect: getBalance not implemented - balance returned in transaction responses')
  }

  /**
   * Get available service plans
   */
  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    if (service === 'DATA') {
      try {
        const url = `/APIDatabundlePlansV2.asp?${this.getAuthParams()}`

        const response = await retry(
          () => this.client.get(url),
          vendorRetryOptions
        )

        // ClubKonnect returns plans in a specific format
        // Parse and filter by network if specified
        const plans: ServicePlan[] = []

        // Response format may vary - handle both JSON and text
        let data = response.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch (e) {
            throw new Error('Invalid response format from ClubKonnect')
          }
        }

        // Map ClubKonnect plans to our ServicePlan format
        if (Array.isArray(data)) {
          for (const plan of data) {
            const planNetwork = this.mapNetworkCode(plan.network || plan.Network)
            
            // Filter by network if specified
            if (network && planNetwork !== network) {
              continue
            }

            plans.push({
              id: plan.dataplan || plan.DataPlan || plan.id,
              name: plan.plan_name || plan.PlanName || `${plan.size || ''} - ${plan.validity || ''}`,
              network: planNetwork,
              price: parseFloat(plan.price || plan.Price || '0'),
              faceValue: parseFloat(plan.face_value || plan.FaceValue || plan.price || '0'),
              validity: plan.validity || plan.Validity,
              isAvailable: true,
              metadata: plan,
            })
          }
        }

        return plans
      } catch (error: any) {
        throw this.handleError(error)
      }
    }

    if (service === 'AIRTIME') {
      // ClubKonnect has airtime discount endpoint
      try {
        const url = `/APIAirtimeDiscountV2.asp?${this.getAuthParams()}`

        const response = await retry(
          () => this.client.get(url),
          vendorRetryOptions
        )

        // Return airtime discounts as plans
        const plans: ServicePlan[] = []
        let data = response.data
        
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch (e) {
            throw new Error('Invalid response format from ClubKonnect')
          }
        }

        if (Array.isArray(data)) {
          for (const discount of data) {
            const planNetwork = this.mapNetworkCode(discount.network || discount.Network)
            
            if (network && planNetwork !== network) {
              continue
            }

            plans.push({
              id: planNetwork,
              name: `${planNetwork} Airtime (${discount.discount || discount.Discount}% discount)`,
              network: planNetwork,
              price: 0, // Variable pricing for airtime
              isAvailable: true,
              metadata: discount,
            })
          }
        }

        return plans
      } catch (error: any) {
        throw this.handleError(error)
      }
    }

    throw new Error(`ClubKonnect: Service ${service} not supported`)
  }

  /**
   * ClubKonnect doesn't support customer verification
   */
  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    throw new Error('ClubKonnect: Customer verification not supported')
  }

  /**
   * Purchase a service (airtime or data only)
   */
  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    if (payload.service !== 'AIRTIME' && payload.service !== 'DATA') {
      throw new Error(`ClubKonnect: Service ${payload.service} not supported`)
    }

    try {
      const networkCode = this.getNetworkCode(payload.network)
      const phone = normalizePhone(payload.phone!)
      const authParams = this.getAuthParams()

      let url = ''

      if (payload.service === 'AIRTIME') {
        // Airtime purchase
        url = `/APIAirtimeV1.asp?${authParams}&MobileNetwork=${networkCode}&Amount=${payload.amount}&MobileNumber=${phone}&RequestID=${payload.idempotencyKey}`
        
        // Add callback URL if provided
        if (payload.metadata?.callbackUrl) {
          url += `&CallBackURL=${encodeURIComponent(payload.metadata.callbackUrl)}`
        }
      } else {
        // Data purchase
        url = `/APIDatabundleV1.asp?${authParams}&MobileNetwork=${networkCode}&DataPlan=${payload.planId}&MobileNumber=${phone}&RequestID=${payload.idempotencyKey}`
        
        // Add callback URL if provided
        if (payload.metadata?.callbackUrl) {
          url += `&CallBackURL=${encodeURIComponent(payload.metadata.callbackUrl)}`
        }
      }

      // Make GET request (no retry for purchases)
      const response = await this.client.get(url)

      let data = response.data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch (e) {
          // Handle text response
          data = { status: data }
        }
      }

      const status = this.mapVendorStatus(data.statuscode || data.StatusCode || data.status)

      return {
        success: status === 'COMPLETED' || data.status === 'ORDER_RECEIVED',
        status,
        orderId: data.orderid || data.OrderID || payload.idempotencyKey,
        vendorReference: data.orderid || data.OrderID || '',
        vendorName: 'CLUBKONNECT',
        costPrice: parseFloat(data.amountcharged || data.AmountCharged || '0'),
        message: data.remark || data.Remark || data.status || 'Purchase initiated',
        metadata: {
          ...data,
          walletBalance: data.walletbalance || data.WalletBalance,
        },
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  /**
   * Query transaction status
   */
  async queryTransaction(reference: string | number): Promise<TransactionStatus> {
    try {
      const authParams = this.getAuthParams()
      
      // ClubKonnect supports query by OrderID or RequestID
      let url = `/APIQueryV1.asp?${authParams}`
      
      // Try OrderID first, then RequestID
      if (reference.toString().match(/^[0-9a-f-]{36}$/i)) {
        // Looks like a UUID (RequestID)
        url += `&RequestID=${reference}`
      } else {
        // Numeric OrderID
        url += `&OrderID=${reference}`
      }

      const response = await retry(
        () => this.client.get(url),
        vendorRetryOptions
      )

      let data = response.data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch (e) {
          data = { status: data }
        }
      }

      const status = this.mapVendorStatus(data.statuscode || data.StatusCode || data.status)

      return {
        status,
        reference: data.orderid || data.OrderID || reference.toString(),
        message: data.remark || data.Remark || data.status || '',
        metadata: data,
      }
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  /**
   * Map ClubKonnect network codes to NetworkType
   */
  private mapNetworkCode(code: string): NetworkType {
    const codeMap: Record<string, NetworkType> = {
      '01': 'MTN',
      '02': 'GLO',
      '03': '9MOBILE',
      '04': 'AIRTEL',
      'MTN': 'MTN',
      'GLO': 'GLO',
      'AIRTEL': 'AIRTEL',
      '9MOBILE': '9MOBILE',
    }

    return codeMap[code] || 'MTN'
  }

  /**
   * Map ClubKonnect status codes to our standard status enum
   */
  private mapVendorStatus(statusCode: string | number): VendorTransactionStatus {
    const code = statusCode?.toString() || ''

    const statusMap: Record<string, VendorTransactionStatus> = {
      '100': 'PENDING',          // ORDER_RECEIVED
      '200': 'COMPLETED',        // ORDER_COMPLETED
      '300': 'FAILED',           // ORDER_FAILED
      'ORDER_RECEIVED': 'PENDING',
      'ORDER_ONHOLD': 'PENDING',
      'ORDER_COMPLETED': 'COMPLETED',
      'ORDER_FAILED': 'FAILED',
      'ORDER_CANCELLED': 'FAILED',
    }

    return statusMap[code] || 'PENDING'
  }

  /**
   * Handle and transform vendor errors
   */
  private handleError(error: any): never {
    const status = error.response?.status
    const data = error.response?.data

    // Parse error response
    let errorMessage = 'Unknown ClubKonnect error'
    if (typeof data === 'string') {
      errorMessage = data
    } else if (data?.message || data?.Message) {
      errorMessage = data.message || data.Message
    } else if (data?.remark || data?.Remark) {
      errorMessage = data.remark || data.Remark
    }

    // Handle specific error messages
    if (errorMessage.includes('INVALID_CREDENTIALS') || errorMessage.includes('MISSING_CREDENTIALS')) {
      throw new VendorError(
        'ClubKonnect authentication failed',
        'CLUBKONNECT',
        401,
        data
      )
    }

    if (errorMessage.includes('INVALID_AMOUNT') || errorMessage.includes('MINIMUM_') || errorMessage.includes('MAXIMUM_')) {
      throw new VendorError(
        errorMessage,
        'CLUBKONNECT',
        400,
        data
      )
    }

    if (errorMessage.includes('INVALID_RECIPIENT')) {
      throw new VendorError(
        'Invalid phone number',
        'CLUBKONNECT',
        400,
        data
      )
    }

    if (status >= 500) {
      throw new VendorError(
        'ClubKonnect service temporarily unavailable',
        'CLUBKONNECT',
        status,
        data
      )
    }

    throw new VendorError(
      errorMessage,
      'CLUBKONNECT',
      status || 500,
      data
    )
  }
}
