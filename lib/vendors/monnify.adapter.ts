/**
 * Monnify Bills Payment Vendor Adapter
 *
 * Implementation of VendorAdapter interface for Monnify's Bills Payment API.
 * Docs: https://developers.monnify.com/api/#bills-payment
 *
 * NOTE: Bills API requires activation — email integration-support@monnify.com
 * before this adapter can process live transactions.
 *
 * Auth: Same Basic Auth → Bearer token pattern as the Virtual Account module.
 * Endpoints:
 *   GET  /api/v1/bills/categories
 *   GET  /api/v1/bills/billers?categoryCode={code}
 *   GET  /api/v1/bills/billers/{billerCode}/products
 *   POST /api/v1/bills/validate
 *   POST /api/v1/bills/vend
 *   GET  /api/v1/bills/transactions/{reference}
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

// ─────────────────────────────────────────────────────────────────────────────
// Keyword maps: used to fuzzy-match Monnify's category/biller names (which are
// discovered dynamically from the API) to our internal ServiceType / NetworkType.
// Extend these once live category names are confirmed from the sandbox API.
// ─────────────────────────────────────────────────────────────────────────────

/** Map our ServiceType → keywords expected in Monnify category names */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  AIRTIME:    ['airtime', 'mobile recharge', 'recharge', 'top-up', 'topup'],
  DATA:       ['data', 'internet', 'broadband', 'data bundle'],
  ELECTRICITY:['electricity', 'electric', 'power', 'disco', 'prepaid meter', 'postpaid meter', 'bills'],
  CABLE_TV:   ['cable', 'tv', 'television', 'dstv', 'gotv', 'startimes', 'showmax'],
  CABLE:      ['cable', 'tv', 'television', 'dstv', 'gotv', 'startimes', 'showmax'],
  EDUCATION:  ['education', 'waec', 'jamb', 'exam', 'result', 'scratch card', 'epin'],
}

/** Map our NetworkType → keywords expected in Monnify biller names */
const NETWORK_KEYWORDS: Record<string, string[]> = {
  MTN:        ['mtn'],
  GLO:        ['glo', 'globacom'],
  AIRTEL:     ['airtel', 'airtel nigeria'],
  '9MOBILE':  ['9mobile', 'etisalat', 'emts'],
  SMILE:      ['smile'],
  SPECTRANET: ['spectranet'],
  DSTV:       ['dstv', 'multichoice dstv'],
  GOTV:       ['gotv', 'go tv'],
  STARTIMES:  ['startimes', 'star times'],
  SHOWMAX:    ['showmax'],
  WAEC:       ['waec', 'west african', 'wassce'],
  WAEC_REG:   ['waec registration', 'waec reg'],
  JAMB:       ['jamb', 'utme'],
  NECO:       ['neco', 'national examinations', 'national exam council'],
  // DISCOs
  IKEJA:      ['ikeja', 'ikedc'],
  EKO:        ['eko', 'ekedc'],
  ABUJA:      ['abuja', 'aedc'],
  KANO:       ['kano', 'kedco'],
  PORTHARCOURT:['ph', 'port harcourt', 'phdc', 'phedc'],
  JOS:        ['jos', 'jedc'],
  IBADAN:     ['ibadan', 'ibedc'],
  KADUNA:     ['kaduna', 'kaedco'],
  ENUGU:      ['enugu', 'eedc'],
  BENIN:      ['benin', 'bedc'],
  ABA:        ['aba'],
  YOLA:       ['yola', 'yedc'],
}

// ─────────────────────────────────────────────────────────────────────────────
// In-process cache types
// ─────────────────────────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string
  expiresAt: number
}

interface MonnifyCategory {
  categoryCode: string
  categoryName: string
}

interface MonnifyBiller {
  billerCode: string
  billerName: string
  categoryCode: string
}

interface MonnifyProduct {
  productCode: string
  productName: string
  amount: number
  type: 'FIXED' | 'VARIABLE'
  min?: number
  max?: number
  fieldLabels?: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: keyword match
// ─────────────────────────────────────────────────────────────────────────────

function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────────────────────────────────────────

export class MonnifyAdapter implements VendorAdapter {
  private client: AxiosInstance
  private tokenCache: TokenCache | null = null

  // Discovery caches (TTL = session lifetime of this adapter instance)
  private categoryCache: MonnifyCategory[] | null = null
  private billerCache: Map<string, MonnifyBiller[]> = new Map() // keyed by categoryCode
  private productCache: Map<string, MonnifyProduct[]> = new Map() // keyed by billerCode

  constructor(
    private readonly credentials: {
      apiKey: string
      secretKey: string
      baseUrl?: string
    }
  ) {
    const baseURL = credentials.baseUrl || 'https://sandbox.monnify.com'

    this.client = axios.create({
      baseURL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  getName(): VendorName {
    return 'MONNIFY'
  }

  getSupportedServices(): ServiceType[] {
    return ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'CABLE_TV', 'EDUCATION']
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  async authenticate(): Promise<void> {
    const now = Date.now()
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return // still valid
    }

    const { apiKey, secretKey } = this.credentials
    if (!apiKey || !secretKey) {
      throw new VendorError('Monnify credentials not configured', 'MONNIFY', 500, null)
    }

    const basicCredentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')

    try {
      const response = await retry(
        () =>
          this.client.post(
            '/api/v1/auth/login',
            {},
            { headers: { Authorization: `Basic ${basicCredentials}` } }
          ),
        { ...vendorRetryOptions, maxRetries: 3 }
      )

      const body = response.data
      if (!body.requestSuccessful) {
        throw new VendorError('Monnify auth unsuccessful', 'MONNIFY', 401, body)
      }

      const { accessToken, expiresIn } = body.responseBody as {
        accessToken: string
        expiresIn: number
      }
      this.tokenCache = { accessToken, expiresAt: now + expiresIn * 1_000 }
      console.log('[Monnify] Authenticated successfully')
    } catch (error: any) {
      if (error instanceof VendorError) throw error
      throw new VendorError(
        `Monnify authentication failed: ${error.message}`,
        'MONNIFY',
        error.response?.status || 500,
        error.response?.data
      )
    }
  }

  isAuthenticated(): boolean {
    return !!this.tokenCache && this.tokenCache.expiresAt > Date.now()
  }

  private authHeader(): Record<string, string> {
    if (!this.tokenCache) throw new VendorError('Not authenticated', 'MONNIFY', 401, null)
    return { Authorization: `Bearer ${this.tokenCache.accessToken}` }
  }

  // ── Balance ─────────────────────────────────────────────────────────────────

  async getBalance(): Promise<WalletBalance> {
    throw new VendorError(
      'Monnify Bills API does not expose a VAS wallet balance endpoint',
      'MONNIFY',
      501,
      null
    )
  }

  // ── Discovery helpers ───────────────────────────────────────────────────────

  private async getCategories(): Promise<MonnifyCategory[]> {
    if (this.categoryCache) return this.categoryCache

    await this.authenticate()
    try {
      const response = await retry(
        () => this.client.get('/api/v1/bills/categories', { headers: this.authHeader() }),
        vendorRetryOptions
      )
      const body = response.data
      if (!body.requestSuccessful) {
        throw new VendorError('Failed to fetch Monnify categories', 'MONNIFY', 400, body)
      }
      this.categoryCache = (body.responseBody as MonnifyCategory[]) || []
      return this.categoryCache
    } catch (error: any) {
      if (error instanceof VendorError) throw error
      throw new VendorError(
        `Monnify getCategories failed: ${error.message}`,
        'MONNIFY',
        error.response?.status || 500,
        error.response?.data
      )
    }
  }

  private async getBillers(categoryCode: string): Promise<MonnifyBiller[]> {
    if (this.billerCache.has(categoryCode)) {
      return this.billerCache.get(categoryCode)!
    }

    await this.authenticate()
    try {
      const response = await retry(
        () =>
          this.client.get('/api/v1/bills/billers', {
            params: { categoryCode },
            headers: this.authHeader(),
          }),
        vendorRetryOptions
      )
      const body = response.data
      if (!body.requestSuccessful) {
        throw new VendorError(`Failed to fetch billers for ${categoryCode}`, 'MONNIFY', 400, body)
      }
      const billers = (body.responseBody as MonnifyBiller[]) || []
      this.billerCache.set(categoryCode, billers)
      return billers
    } catch (error: any) {
      if (error instanceof VendorError) throw error
      throw new VendorError(
        `Monnify getBillers failed for ${categoryCode}: ${error.message}`,
        'MONNIFY',
        error.response?.status || 500,
        error.response?.data
      )
    }
  }

  private async getProducts(billerCode: string): Promise<MonnifyProduct[]> {
    if (this.productCache.has(billerCode)) {
      return this.productCache.get(billerCode)!
    }

    await this.authenticate()
    try {
      const response = await retry(
        () =>
          this.client.get(`/api/v1/bills/billers/${billerCode}/products`, {
            headers: this.authHeader(),
          }),
        vendorRetryOptions
      )
      const body = response.data
      if (!body.requestSuccessful) {
        throw new VendorError(`Failed to fetch products for ${billerCode}`, 'MONNIFY', 400, body)
      }
      const products = (body.responseBody as MonnifyProduct[]) || []
      this.productCache.set(billerCode, products)
      return products
    } catch (error: any) {
      if (error instanceof VendorError) throw error
      throw new VendorError(
        `Monnify getProducts failed for ${billerCode}: ${error.message}`,
        'MONNIFY',
        error.response?.status || 500,
        error.response?.data
      )
    }
  }

  /**
   * Resolve a Monnify billerCode for the given service + network.
   * Uses keyword matching since Monnify's codes are not publicly documented.
   * Returns null if no match found.
   */
  private async resolveBillerCode(
    service: ServiceType,
    network?: NetworkType | string
  ): Promise<string | null> {
    // 1. Find the category matching this service
    const categories = await this.getCategories()
    const keywords = CATEGORY_KEYWORDS[service] || [service.toLowerCase()]
    const category = categories.find(c => matchesAnyKeyword(c.categoryName, keywords))

    if (!category) {
      console.warn(`[Monnify] No category found for service ${service}. Available: ${categories.map(c => c.categoryName).join(', ')}`)
      return null
    }

    // 2. Find the biller matching this network/provider within the category
    const billers = await this.getBillers(category.categoryCode)

    if (!network) {
      // Return the first biller if no network specified (e.g. electricity or cable)
      return billers[0]?.billerCode ?? null
    }

    const netKeywords = NETWORK_KEYWORDS[network.toUpperCase()] || [network.toLowerCase()]
    const biller = billers.find(b => matchesAnyKeyword(b.billerName, netKeywords))

    if (!biller) {
      console.warn(`[Monnify] No biller found for service=${service} network=${network}. Available billers: ${billers.map(b => b.billerName).join(', ')}`)
      return null
    }

    return biller.billerCode
  }

  // ── Plans ────────────────────────────────────────────────────────────────────

  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    // Airtime is amount-based — no fixed plans
    if (service === 'AIRTIME') return []

    try {
      // For electricity, provider comes through as network (IKEJA, EKO, etc.)
      const effectiveNetwork = network
      const billerCode = await this.resolveBillerCode(service, effectiveNetwork)

      if (!billerCode) {
        console.warn(`[Monnify] Cannot resolve biller for ${service}/${network} — returning empty plans`)
        return []
      }

      const products = await this.getProducts(billerCode)

      return products.map(p => ({
        id: p.productCode,
        name: p.productName,
        network: (network || 'MTN') as NetworkType,
        price: p.amount,
        faceValue: p.amount,
        isAvailable: true,
        metadata: {
          billerCode,
          type: p.type,
          min: p.min,
          max: p.max,
          fieldLabels: p.fieldLabels,
        },
      }))
    } catch (error: any) {
      console.error(`[Monnify] getPlans error for ${service}/${network}:`, error.message)
      return []
    }
  }

  // ── Customer Verification ────────────────────────────────────────────────────

  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    // Determine network/provider from the service payload
    const network = payload.serviceProvider

    try {
      const billerCode = await this.resolveBillerCode(payload.service, network)
      if (!billerCode) {
        return { isValid: false, metadata: { error: `No biller found for ${payload.service}/${network}` } }
      }

      // We need a productCode to validate — get the first/cheapest relevant product
      const products = await this.getProducts(billerCode)
      const productCode = products[0]?.productCode

      if (!productCode) {
        return { isValid: false, metadata: { error: `No products found for biller ${billerCode}` } }
      }

      await this.authenticate()
      const response = await retry(
        () =>
          this.client.post(
            '/api/v1/bills/validate',
            {
              billerCode,
              productCode,
              amount: 0, // amount is 0 for pure validation
              customerAccountNumber: payload.customerId,
            },
            { headers: this.authHeader() }
          ),
        { ...vendorRetryOptions, maxRetries: 2 }
      )

      const body = response.data
      if (!body.requestSuccessful) {
        return {
          isValid: false,
          metadata: { error: body.responseMessage || 'Validation failed', raw: body },
        }
      }

      const rb = body.responseBody || {}
      return {
        isValid: true,
        customerName: rb.customerName || rb.name,
        address: rb.customerAddress || rb.address,
        accountType: rb.accountType,
        metadata: {
          validationReference: rb.validationReference,
          billerCode,
          productCode,
          customerDetails: rb,
        },
      }
    } catch (error: any) {
      console.error('[Monnify] verifyCustomer error:', error.message)
      return {
        isValid: false,
        metadata: { error: error.message },
      }
    }
  }

  // ── Buy Service ─────────────────────────────────────────────────────────────

  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    // 1. Determine the biller + product codes
    // For cable/electricity, provider comes via payload.network
    const networkOrProvider = payload.network || (payload.metadata?.provider as string)

    let billerCode: string | null = null
    let productCode: string | null = null

    // If we have biller/product in metadata from a prior verifyCustomer call, reuse them
    if (payload.metadata?.billerCode && payload.metadata?.productCode) {
      billerCode = payload.metadata.billerCode as string
      productCode = payload.metadata.productCode as string
    } else {
      billerCode = await this.resolveBillerCode(payload.service, networkOrProvider)
      if (!billerCode) {
        return this.failResponse(payload, 'Cannot resolve biller for the requested service')
      }

      if (payload.planId) {
        productCode = payload.planId
      } else {
        // For airtime or variable-amount services, find a variable-type product
        const products = await this.getProducts(billerCode)
        const variableProduct = products.find(p => p.type === 'VARIABLE')
        productCode = variableProduct?.productCode ?? products[0]?.productCode ?? null
      }

      if (!productCode) {
        return this.failResponse(payload, `No product found for biller ${billerCode}`)
      }
    }

    // 2. Validate first — Monnify requires a validationReference to vend
    await this.authenticate()
    let validationReference: string | undefined = payload.metadata?.validationReference as string | undefined

    if (!validationReference) {
      try {
        const valResponse = await retry(
          () =>
            this.client.post(
              '/api/v1/bills/validate',
              {
                billerCode,
                productCode,
                amount: payload.amount,
                customerAccountNumber: payload.customerId || payload.phone,
              },
              { headers: this.authHeader() }
            ),
          { ...vendorRetryOptions, maxRetries: 2 }
        )

        const valBody = valResponse.data
        if (!valBody.requestSuccessful) {
          return this.failResponse(
            payload,
            valBody.responseMessage || 'Customer validation failed'
          )
        }
        validationReference = valBody.responseBody?.validationReference
      } catch (error: any) {
        return this.failResponse(payload, `Validation error: ${error.message}`)
      }
    }

    if (!validationReference) {
      return this.failResponse(payload, 'No validationReference returned by Monnify validate step')
    }

    // 3. Vend
    const transactionReference = payload.idempotencyKey

    try {
      const vendResponse = await retry(
        () =>
          this.client.post(
            '/api/v1/bills/vend',
            {
              billerCode,
              productCode,
              amount: payload.amount,
              customerAccountNumber: payload.customerId || payload.phone,
              transactionReference,
              validationReference,
              narration: `${payload.service} purchase`,
            },
            { headers: this.authHeader() }
          ),
        { ...vendorRetryOptions, maxRetries: 1 } // 1 retry only for purchases to avoid double spend
      )

      const vendBody = vendResponse.data
      console.log('[Monnify] Vend response:', JSON.stringify(vendBody, null, 2))

      if (!vendBody.requestSuccessful) {
        const msg = vendBody.responseMessage || 'Vend failed'
        console.error(`[Monnify] Vend failed: ${msg}`)
        return {
          success: false,
          status: 'FAILED',
          orderId: payload.idempotencyKey,
          vendorReference: transactionReference,
          vendorName: 'MONNIFY',
          costPrice: 0,
          message: msg,
          metadata: { raw: vendBody },
        }
      }

      const rb = vendBody.responseBody || {}
      const status: VendorTransactionStatus =
        rb.status === 'COMPLETED' || rb.status === 'SUCCESSFUL' ? 'COMPLETED'
        : rb.status === 'PENDING' ? 'PENDING'
        : 'COMPLETED' // Monnify vend success implies delivery

      return {
        success: true,
        status,
        orderId: payload.idempotencyKey,
        vendorReference: rb.transactionReference || transactionReference,
        vendorName: 'MONNIFY',
        costPrice: parseFloat(rb.amount || rb.totalAmount || String(payload.amount || 0)),
        message: rb.statusDescription || rb.message || 'Purchase successful',
        metadata: {
          transactionReference: rb.transactionReference,
          token: rb.token, // electricity token
          pin: rb.pin,     // education PIN
          receiptNumber: rb.receiptNumber,
          customerDetails: rb.customerDetails,
          raw: rb,
        },
      }
    } catch (error: any) {
      console.error('[Monnify] buyService error:', error.message)
      return this.failResponse(payload, error.response?.data?.responseMessage || error.message)
    }
  }

  // ── Query Transaction ────────────────────────────────────────────────────────

  async queryTransaction(reference: string | number): Promise<TransactionStatus> {
    await this.authenticate()

    try {
      const response = await retry(
        () =>
          this.client.get(`/api/v1/bills/transactions/${reference}`, {
            headers: this.authHeader(),
          }),
        vendorRetryOptions
      )

      const body = response.data
      if (!body.requestSuccessful) {
        return {
          status: 'FAILED',
          reference: String(reference),
          message: body.responseMessage || 'Transaction not found',
          metadata: body,
        }
      }

      const rb = body.responseBody || {}
      let status: VendorTransactionStatus
      switch ((rb.status || '').toUpperCase()) {
        case 'COMPLETED':
        case 'SUCCESSFUL':
        case 'SUCCESS':
          status = 'COMPLETED'
          break
        case 'PENDING':
        case 'PROCESSING':
          status = 'PENDING'
          break
        case 'FAILED':
        case 'FAILURE':
          status = 'FAILED'
          break
        default:
          status = 'PENDING'
      }

      return {
        status,
        reference: String(reference),
        message: rb.statusDescription || rb.message || status,
        metadata: rb,
      }
    } catch (error: any) {
      console.error('[Monnify] queryTransaction error:', error.message)
      return {
        status: 'PENDING',
        reference: String(reference),
        message: error.message,
        metadata: { error: error.response?.data },
      }
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private failResponse(payload: PurchasePayload, message: string): VendorPurchaseResponse {
    console.error(`[Monnify] Purchase failed: ${message}`)
    return {
      success: false,
      status: 'FAILED',
      orderId: payload.idempotencyKey,
      vendorReference: payload.idempotencyKey,
      vendorName: 'MONNIFY',
      costPrice: 0,
      message,
      metadata: { error: message },
    }
  }
}
