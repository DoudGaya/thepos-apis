/**
 * Amigo Data Vending API Adapter
 * 
 * Implements the VendorAdapter interface for Amigo.ng data vending service.
 * Supports MTN and Glo networks (Airtel & 9mobile coming soon).
 * 
 * API Documentation: https://amigo.ng/api/docs
 */

import axios, { AxiosInstance } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { retry } from '../utils/retry'
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
  VendorError,
} from './adapter.interface'

// Amigo-specific types
interface AmigoPlan {
  plan_id: number
  data_capacity: number // in GB
  validity: number // days
  price: number
  efficiency_percent?: number
  efficiency_label?: string
}

interface AmigoNetworkPlans {
  ok: boolean
  MTN?: AmigoPlan[]
  Glo?: AmigoPlan[]
  Airtel?: AmigoPlan[]
  '9mobile'?: AmigoPlan[]
}

interface AmigoPurchaseRequest {
  network: number // 1=MTN, 2=Glo, 4=Airtel, 9=9mobile
  mobile_number: string // 09012345678 format
  plan: number // plan_id
  Ported_number: boolean
}

interface AmigoPurchaseResponse {
  success: boolean
  reference?: string
  message: string
  network?: number
  plan?: number
  amount_charged?: number
  status?: string // 'delivered' | 'pending' | 'failed'
  error?: string
}

/**
 * Amigo Network Mapping
 * Maps our NetworkType to Amigo's network_id
 */
const AMIGO_NETWORK_MAP: Record<NetworkType, number> = {
  MTN: 1,
  GLO: 2,
  AIRTEL: 4,
  '9MOBILE': 9,
  SMILE: 0, // Not supported
}

/**
 * Reverse mapping for responses
 */
const NETWORK_ID_MAP: Record<number, NetworkType> = {
  1: 'MTN',
  2: 'GLO',
  4: 'AIRTEL',
  9: '9MOBILE',
}

export class AmigoAdapter implements VendorAdapter {
  private apiToken: string
  private baseURL: string = 'https://amigo.ng/api'
  private client: AxiosInstance
  private authenticated: boolean = false

  // Plan cache (refreshed every 5 minutes)
  private planCache: Map<NetworkType, ServicePlan[]> = new Map()
  private planCacheExpiry: Date | null = null
  private readonly CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  constructor(apiToken: string) {
    this.apiToken = apiToken

    // Initialize axios client
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const data = error.response.data
          throw new VendorError(
            data.message || 'Amigo API request failed',
            'AMIGO',
            error.response.status,
            data
          )
        }
        throw error
      }
    )
  }

  getName(): VendorName {
    return 'AMIGO' as VendorName
  }

  getSupportedServices(): ServiceType[] {
    // Amigo currently only supports DATA
    return ['DATA']
  }

  async authenticate(): Promise<void> {
    // Amigo uses token-based auth - no separate auth endpoint
    // Verify token by fetching plans
    try {
      await this.fetchPlansFromAPI()
      this.authenticated = true
    } catch (error: any) {
      this.authenticated = false
      throw new VendorError(
        'Amigo API token authentication failed',
        'AMIGO',
        401,
        error
      )
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated
  }

  async getBalance(): Promise<WalletBalance> {
    // Amigo doesn't have a dedicated balance endpoint
    // Return placeholder - balance is shown in dashboard
    throw new VendorError(
      'Balance check not supported by Amigo API. Check your dashboard at https://amigo.ng',
      'AMIGO',
      501,
      { feature: 'balance_check_not_available' }
    )
  }

  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    if (service !== 'DATA') {
      throw new VendorError(
        `Service ${service} not supported. Amigo only supports DATA.`,
        'AMIGO',
        400,
        { supported_services: ['DATA'] }
      )
    }

    // Check cache first
    if (this.isCacheValid() && network && this.planCache.has(network)) {
      return this.planCache.get(network)!
    }

    // Fetch fresh plans
    const allPlans = await this.fetchPlansFromAPI()

    // If specific network requested, return only those plans
    if (network) {
      return allPlans.filter((p) => p.network === network)
    }

    return allPlans
  }

  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    if (payload.service !== 'DATA') {
      throw new VendorError(
        'Only DATA service is supported by Amigo',
        'AMIGO',
        400,
        { service: payload.service }
      )
    }

    if (!payload.planId) {
      throw new VendorError(
        'Plan ID is required for data purchase',
        'AMIGO',
        400,
        { missing_field: 'planId' }
      )
    }

    if (!payload.phone) {
      throw new VendorError(
        'Phone number is required for data purchase',
        'AMIGO',
        400,
        { missing_field: 'phone' }
      )
    }

    // Map network to Amigo network_id
    const networkId = AMIGO_NETWORK_MAP[payload.network]
    if (!networkId || networkId === 0) {
      throw new VendorError(
        `Network ${payload.network} not supported by Amigo`,
        'AMIGO',
        400,
        { network: payload.network, supported: ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] }
      )
    }

    // Normalize phone number (remove +234, leading 0 is ok)
    const normalizedPhone = this.normalizePhone(payload.phone)

    // Build request
    const request: AmigoPurchaseRequest = {
      network: networkId,
      mobile_number: normalizedPhone,
      plan: parseInt(payload.planId), // Convert to number
      Ported_number: true, // Always assume ported for safety
    }

    // Generate idempotency key if not provided
    const idempotencyKey = payload.idempotencyKey || uuidv4()

    try {
      // Make purchase request with retry logic
      const response = await retry(
        async () => {
          return await this.client.post<AmigoPurchaseResponse>('/data/', request, {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          })
        },
        {
          maxRetries: 2,
          baseDelay: 2000,
          maxDelay: 10000,
          shouldRetry: (error: any) => {
            // Retry on 5xx errors or network issues
            return !error.response || error.response.status >= 500
          },
        }
      )

      const data = response.data

      if (!data.success) {
        throw new VendorError(
          data.message || 'Purchase failed',
          'AMIGO',
          400,
          data
        )
      }

      // Map status
      const status = this.mapStatus(data.status || 'delivered')

      return {
        success: true,
        status,
        orderId: payload.idempotencyKey, // Our internal order ID
        vendorReference: data.reference || idempotencyKey,
        vendorName: 'AMIGO' as VendorName,
        costPrice: data.amount_charged || 0,
        message: data.message,
        metadata: {
          network: data.network,
          plan: data.plan,
          phone: normalizedPhone,
          amigo_status: data.status,
        },
      }
    } catch (error: any) {
      if (error instanceof VendorError) {
        throw error
      }

      throw new VendorError(
        error.message || 'Purchase request failed',
        'AMIGO',
        error.response?.status || 500,
        error.response?.data || error
      )
    }
  }

  async queryTransaction(reference: string | number): Promise<TransactionStatus> {
    // Amigo doesn't have a dedicated transaction query endpoint
    // Transactions are instant, so we assume delivered if reference exists
    throw new VendorError(
      'Transaction query not supported by Amigo API. All transactions are instant.',
      'AMIGO',
      501,
      { feature: 'query_not_available' }
    )
  }

  /**
   * Fetch all plans from Amigo API
   */
  private async fetchPlansFromAPI(): Promise<ServicePlan[]> {
    try {
      const response = await this.client.get<AmigoNetworkPlans>('/plans/efficiency')

      if (!response.data.ok) {
        throw new Error('Failed to fetch plans from Amigo')
      }

      const allPlans: ServicePlan[] = []

      // Process MTN plans
      if (response.data.MTN) {
        const mtnPlans = response.data.MTN.map((plan) => this.mapPlanToServicePlan(plan, 'MTN'))
        allPlans.push(...mtnPlans)
        this.planCache.set('MTN', mtnPlans)
      }

      // Process Glo plans
      if (response.data.Glo) {
        const gloPlans = response.data.Glo.map((plan) => this.mapPlanToServicePlan(plan, 'GLO'))
        allPlans.push(...gloPlans)
        this.planCache.set('GLO', gloPlans)
      }

      // Process Airtel plans (when available)
      if (response.data.Airtel) {
        const airtelPlans = response.data.Airtel.map((plan) => this.mapPlanToServicePlan(plan, 'AIRTEL'))
        allPlans.push(...airtelPlans)
        this.planCache.set('AIRTEL', airtelPlans)
      }

      // Process 9mobile plans (when available)
      if (response.data['9mobile']) {
        const nmobilePlans = response.data['9mobile'].map((plan) => this.mapPlanToServicePlan(plan, '9MOBILE'))
        allPlans.push(...nmobilePlans)
        this.planCache.set('9MOBILE', nmobilePlans)
      }

      // Update cache expiry
      this.planCacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS)

      return allPlans
    } catch (error: any) {
      throw new VendorError(
        'Failed to fetch plans from Amigo',
        'AMIGO',
        error.response?.status || 500,
        error.response?.data || error
      )
    }
  }

  /**
   * Map Amigo plan to ServicePlan interface
   */
  private mapPlanToServicePlan(plan: AmigoPlan, network: NetworkType): ServicePlan {
    return {
      id: plan.plan_id.toString(),
      name: `${this.formatDataCapacity(plan.data_capacity)} - ${plan.validity} Days`,
      network,
      price: plan.price,
      faceValue: plan.price,
      validity: `${plan.validity} Days`,
      isAvailable: true,
      metadata: {
        data_capacity_gb: plan.data_capacity,
        validity_days: plan.validity,
        efficiency_percent: plan.efficiency_percent,
        efficiency_label: plan.efficiency_label,
      },
    }
  }

  /**
   * Format data capacity for display
   */
  private formatDataCapacity(capacityGB: number): string {
    if (capacityGB < 1) {
      return `${Math.round(capacityGB * 1024)}MB`
    }
    return `${capacityGB}GB`
  }

  /**
   * Check if plan cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.planCacheExpiry) return false
    return new Date() < this.planCacheExpiry
  }

  /**
   * Normalize phone number for Amigo API
   * Amigo accepts: 09012345678 format (11 digits starting with 0)
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // Remove country code if present
    if (cleaned.startsWith('234')) {
      cleaned = '0' + cleaned.substring(3)
    }

    // Ensure it starts with 0
    if (!cleaned.startsWith('0')) {
      cleaned = '0' + cleaned
    }

    // Validate length
    if (cleaned.length !== 11) {
      throw new VendorError(
        `Invalid phone number format: ${phone}. Expected 11 digits.`,
        'AMIGO',
        400,
        { phone, normalized: cleaned }
      )
    }

    return cleaned
  }

  /**
   * Map Amigo status to our status enum
   */
  private mapStatus(amigoStatus: string): 'PROCESSING' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' {
    switch (amigoStatus.toLowerCase()) {
      case 'delivered':
        return 'COMPLETED'
      case 'pending':
        return 'PENDING'
      case 'failed':
        return 'FAILED'
      default:
        return 'PENDING'
    }
  }
}
