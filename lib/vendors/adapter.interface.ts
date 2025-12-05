// Vendor Adapter Interface and Types
// This file defines the contract that all vendor adapters must implement

export type VendorName = 'VTU_NG' | 'EBILLS' | 'CLUBKONNECT' | 'AMIGO' | 'VTPASS' | 'SUBANDGAIN'

export type ServiceType = 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'CABLE_TV' | 'BETTING' | 'EPINS'

export type NetworkType = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE' | 'SMILE'

export type VendorTransactionStatus =
  | 'PROCESSING'    // Vendor is processing
  | 'COMPLETED'     // Successfully delivered
  | 'PENDING'       // Awaiting confirmation (check later)
  | 'FAILED'        // Vendor rejected
  | 'REFUNDED'      // Vendor refunded

export interface WalletBalance {
  balance: number
  currency: string
}

export interface ServicePlan {
  id: string                    // variation_id or plan code
  name: string                  // "1GB - 30 Days"
  network: NetworkType
  price: number                 // Vendor's reseller price
  faceValue?: number            // Face value (for display)
  validity?: string             // "30 Days"
  isAvailable: boolean
  metadata?: Record<string, any>
}

export interface PurchasePayload {
  service: ServiceType
  network: NetworkType
  phone?: string                // For airtime/data
  amount?: number               // For airtime/variable services
  planId?: string               // For data/fixed plans
  customerId?: string           // For electricity/cable/betting
  meterType?: 'PREPAID' | 'POSTPAID'  // For electricity
  idempotencyKey: string
  metadata?: Record<string, any>
}

export interface VendorPurchaseResponse {
  success: boolean
  status: VendorTransactionStatus
  orderId: string               // Our internal order ID
  vendorReference: string       // Vendor's reference
  vendorName: VendorName        // Which vendor processed this
  costPrice: number             // What vendor charged us
  message: string
  metadata?: any
}

export interface TransactionStatus {
  status: VendorTransactionStatus
  reference: string
  message: string
  metadata?: any
}

export interface VerifyCustomerPayload {
  customerId: string
  service: ServiceType
  serviceProvider: string       // 'dstv', 'ikeja-electric', etc.
  meterType?: 'PREPAID' | 'POSTPAID'
}

export interface CustomerVerification {
  isValid: boolean
  customerName?: string
  address?: string
  accountType?: string
  metadata?: Record<string, any>
}

/**
 * VendorAdapter Interface
 * 
 * All vendor adapters must implement this interface to ensure
 * consistent behavior across different vendors.
 */
export interface VendorAdapter {
  // Identification
  getName(): VendorName
  getSupportedServices(): ServiceType[]

  // Authentication
  authenticate(): Promise<void>
  isAuthenticated(): boolean

  // Balance
  getBalance(): Promise<WalletBalance>

  // Service Plans
  getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]>

  // Customer Verification (optional - for electricity/cable/betting)
  verifyCustomer?(payload: VerifyCustomerPayload): Promise<CustomerVerification>

  // Purchase
  buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse>

  // Transaction Status
  queryTransaction(reference: string | number): Promise<TransactionStatus>
}

/**
 * Vendor Error Class
 * 
 * Used to wrap vendor-specific errors with additional context
 */
export class VendorError extends Error {
  constructor(
    message: string,
    public vendorName: string,
    public statusCode: number,
    public vendorResponse: any
  ) {
    super(message)
    this.name = 'VendorError'
    Error.captureStackTrace(this, this.constructor)
  }
}
