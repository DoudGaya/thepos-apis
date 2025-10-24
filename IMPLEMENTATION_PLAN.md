# Production Purchase Flow Implementation Plan

**Date:** October 21, 2025  
**Based On:** VENDOR_INTEGRATION_STUDY.md  
**Goal:** Implement hardened, production-ready purchase flows with profit tracking

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema Changes](#database-schema-changes)
3. [Vendor Adapter Pattern](#vendor-adapter-pattern)
4. [Purchase Service Logic](#purchase-service-logic)
5. [Pricing & Profit Rules](#pricing--profit-rules)
6. [Error Handling & Idempotency](#error-handling--idempotency)
7. [Webhook & Reconciliation](#webhook--reconciliation)
8. [Frontend Integration](#frontend-integration)
9. [Admin Tools](#admin-tools)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Checklist](#deployment-checklist)

---

## 1. Architecture Overview

### System Flow Diagram
```
┌─────────────┐
│   Client    │
│ (Web/Mobile)│
└──────┬──────┘
       │ POST /api/services/purchase
       ▼
┌────────────────────────────┐
│   PurchaseService          │
│ ┌────────────────────────┐ │
│ │ 1. Validate Request    │ │
│ │ 2. Check Wallet        │ │
│ │ 3. Calculate Prices    │ │
│ │ 4. Generate Idempotency│ │
│ │ 5. Deduct Wallet       │ │
│ │ 6. Create Transaction  │ │
│ └────────────────────────┘ │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────┐
│   VendorService            │
│ ┌────────────────────────┐ │
│ │ Select Vendor          │ │
│ │ (Primary/Fallback)     │ │
│ └────────────────────────┘ │
└──────────┬─────────────────┘
           │
           ├──────────┬──────────┬──────────┐
           ▼          ▼          ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ VTU.NG   │ │ eBills   │ │ClubKon.. │
    │ Adapter  │ │ Adapter  │ │ Adapter  │
    └──────────┘ └──────────┘ └──────────┘
           │          │          │
           └──────────┴──────────┘
                     │
                     ▼
           ┌─────────────────┐
           │ Vendor API      │
           │ (External)      │
           └─────────────────┘
                     │
                     ▼ (Webhook/Poll)
           ┌─────────────────┐
           │ Update          │
           │ Transaction     │
           │ Status          │
           └─────────────────┘
```

### Directory Structure
```
the-backend/
├── lib/
│   ├── vendors/
│   │   ├── index.ts                    # VendorService orchestrator
│   │   ├── adapter.interface.ts        # VendorAdapter interface
│   │   ├── vtu-ng.adapter.ts          # VTU.NG implementation
│   │   ├── ebills.adapter.ts          # eBills implementation
│   │   ├── clubkonnect.adapter.ts     # ClubKonnect implementation
│   │   └── types.ts                    # Shared types
│   ├── services/
│   │   ├── purchase.service.ts        # Main purchase orchestrator
│   │   ├── pricing.service.ts         # Profit calculation
│   │   ├── wallet.service.ts          # Wallet operations
│   │   └── reconciliation.service.ts  # Background reconciliation
│   └── utils/
│       ├── idempotency.ts             # Idempotency key generation
│       ├── retry.ts                    # Exponential backoff
│       └── phone-normalizer.ts        # Phone number formatting
├── app/api/
│   ├── services/
│   │   ├── purchase/route.ts          # Main purchase endpoint
│   │   ├── plans/route.ts             # Get available plans
│   │   └── verify/route.ts            # Verify customer (electricity/cable)
│   ├── webhooks/
│   │   ├── vtu/route.ts               # VTU.NG webhook handler
│   │   ├── ebills/route.ts            # eBills webhook handler
│   │   └── clubkonnect/route.ts       # ClubKonnect webhook handler
│   └── admin/
│       ├── transactions/
│       │   ├── pending/route.ts       # List pending transactions
│       │   ├── retry/route.ts         # Retry failed transaction
│       │   └── refund/route.ts        # Manual refund
│       ├── vendors/
│       │   └── balance/route.ts       # Check vendor balances
│       └── reports/
│           └── profit/route.ts        # Profit reporting
└── prisma/
    └── migrations/
        └── YYYYMMDD_add_vendor_fields/
```

---

## 2. Database Schema Changes

### New Transaction Fields
```prisma
model Transaction {
  // ... existing fields ...
  
  // Vendor & Idempotency
  vendorName        String?          // 'VTU_NG' | 'EBILLS' | 'CLUBKONNECT'
  vendorReference   String?          // Vendor's order ID
  idempotencyKey    String           @unique // UUID for deduplication
  
  // Pricing & Profit
  costPrice         Decimal          @default(0) // What vendor charged us
  sellingPrice      Decimal          @default(0) // What customer paid
  profit            Decimal          @default(0) // Our profit (sellingPrice - costPrice)
  
  // Vendor Response
  vendorResponse    Json?            // Full vendor response for debugging
  vendorStatus      String?          // Vendor's status string
  
  // Timestamps
  vendorCallAt      DateTime?        // When we called vendor
  vendorResponseAt  DateTime?        // When vendor responded
  
  // ... existing fields ...
}

model VendorConfig {
  id                String           @id @default(cuid())
  vendorName        String           @unique
  isEnabled         Boolean          @default(true)
  isPrimary         Boolean          @default(false)
  priority          Int              @default(0) // 0=highest
  
  // Services
  supportsAirtime   Boolean          @default(true)
  supportsData      Boolean          @default(true)
  supportsElectric  Boolean          @default(false)
  supportsCableTV   Boolean          @default(false)
  supportsBetting   Boolean          @default(false)
  supportsEPINS     Boolean          @default(false)
  
  // Auth (encrypted)
  credentials       Json             // Vendor-specific auth details
  
  // Health
  lastHealthCheck   DateTime?
  isHealthy         Boolean          @default(true)
  failureCount      Int              @default(0)
  lastFailure       DateTime?
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
}

model ProfitMargin {
  id                String           @id @default(cuid())
  service           String           // 'AIRTIME' | 'DATA' | 'ELECTRICITY' | etc.
  vendorName        String?          // null = global default
  
  // Margin Config
  marginType        String           // 'FIXED' | 'PERCENTAGE'
  marginValue       Decimal          // e.g., 100.00 (₦100) or 5.00 (5%)
  
  // Constraints
  minAmount         Decimal?         // Only apply if amount >= this
  maxAmount         Decimal?         // Only apply if amount <= this
  network           String?          // 'MTN' | 'GLO' | etc. (null = all)
  
  // Status
  isActive          Boolean          @default(true)
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@unique([service, vendorName, network])
}
```

### Migration Script
```typescript
// prisma/migrations/YYYYMMDD_add_vendor_fields/migration.sql
-- Add vendor fields to Transaction
ALTER TABLE "Transaction" ADD COLUMN "vendorName" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "vendorReference" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "idempotencyKey" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT;
ALTER TABLE "Transaction" ADD COLUMN "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Transaction" ADD COLUMN "sellingPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Transaction" ADD COLUMN "profit" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Transaction" ADD COLUMN "vendorResponse" JSONB;
ALTER TABLE "Transaction" ADD COLUMN "vendorStatus" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "vendorCallAt" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN "vendorResponseAt" TIMESTAMP(3);

-- Create unique index on idempotencyKey
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

-- Create VendorConfig table
CREATE TABLE "VendorConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vendorName" TEXT NOT NULL UNIQUE,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "supportsAirtime" BOOLEAN NOT NULL DEFAULT true,
  "supportsData" BOOLEAN NOT NULL DEFAULT true,
  "supportsElectric" BOOLEAN NOT NULL DEFAULT false,
  "supportsCableTV" BOOLEAN NOT NULL DEFAULT false,
  "supportsBetting" BOOLEAN NOT NULL DEFAULT false,
  "supportsEPINS" BOOLEAN NOT NULL DEFAULT false,
  "credentials" JSONB NOT NULL,
  "lastHealthCheck" TIMESTAMP(3),
  "isHealthy" BOOLEAN NOT NULL DEFAULT true,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "lastFailure" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create ProfitMargin table
CREATE TABLE "ProfitMargin" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "service" TEXT NOT NULL,
  "vendorName" TEXT,
  "marginType" TEXT NOT NULL,
  "marginValue" DECIMAL(10,2) NOT NULL,
  "minAmount" DECIMAL(10,2),
  "maxAmount" DECIMAL(10,2),
  "network" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "ProfitMargin_service_vendorName_network_key" 
ON "ProfitMargin"("service", "vendorName", "network");

-- Seed default profit margins
INSERT INTO "ProfitMargin" (id, service, marginType, marginValue, isActive) VALUES
  (gen_random_uuid()::TEXT, 'DATA', 'FIXED', 100.00, true),
  (gen_random_uuid()::TEXT, 'AIRTIME', 'PERCENTAGE', 5.00, true),
  (gen_random_uuid()::TEXT, 'ELECTRICITY', 'FIXED', 50.00, true),
  (gen_random_uuid()::TEXT, 'CABLE', 'FIXED', 50.00, true),
  (gen_random_uuid()::TEXT, 'BETTING', 'PERCENTAGE', 2.00, true),
  (gen_random_uuid()::TEXT, 'EPIN', 'PERCENTAGE', 5.00, true);
```

---

## 3. Vendor Adapter Pattern

### Interface Definition
```typescript
// lib/vendors/adapter.interface.ts
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
  
  // Customer Verification (for electricity/cable/betting)
  verifyCustomer?(payload: VerifyCustomerPayload): Promise<CustomerVerification>
  
  // Purchase
  buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse>
  
  // Transaction Status
  queryTransaction(reference: string | number): Promise<TransactionStatus>
}

export type VendorName = 'VTU_NG' | 'EBILLS' | 'CLUBKONNECT'
export type ServiceType = 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'BETTING' | 'EPIN'
export type NetworkType = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE' | 'SMILE'

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
  costPrice: number             // What vendor charged us
  message: string
  metadata?: any
}

export type VendorTransactionStatus = 
  | 'PROCESSING'    // Vendor is processing
  | 'COMPLETED'     // Successfully delivered
  | 'PENDING'       // Awaiting confirmation (check later)
  | 'FAILED'        // Vendor rejected
  | 'REFUNDED'      // Vendor refunded

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
```

### VTU.NG Adapter Implementation
```typescript
// lib/vendors/vtu-ng.adapter.ts
import axios, { AxiosInstance } from 'axios'
import { VendorAdapter, VendorName, ServiceType, /* ... */ } from './adapter.interface'
import { retry } from '@/lib/utils/retry'

export class VTUNGAdapter implements VendorAdapter {
  private baseURL = 'https://vtu.ng/wp-json'
  private client: AxiosInstance
  private token: string | null = null
  private tokenExpiry: Date | null = null
  
  constructor(
    private username: string,
    private password: string
  ) {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  
  getName(): VendorName {
    return 'VTU_NG'
  }
  
  getSupportedServices(): ServiceType[] {
    return ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'BETTING', 'EPIN']
  }
  
  async authenticate(): Promise<void> {
    // Check if token is still valid (refresh 1 hour before expiry)
    if (this.token && this.tokenExpiry) {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
      if (this.tokenExpiry > oneHourFromNow) {
        return // Token still valid
      }
    }
    
    const response = await retry(
      () => this.client.post('/jwt-auth/v1/token', {
        username: this.username,
        password: this.password,
      }),
      { maxRetries: 3, baseDelay: 1000 }
    )
    
    this.token = response.data.token
    // JWT typically expires in 7 days
    this.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
  
  isAuthenticated(): boolean {
    return !!this.token && !!this.tokenExpiry && this.tokenExpiry > new Date()
  }
  
  private getAuthHeaders() {
    if (!this.token) {
      throw new Error('VTU.NG: Not authenticated')
    }
    return { Authorization: `Bearer ${this.token}` }
  }
  
  async getBalance(): Promise<WalletBalance> {
    await this.authenticate()
    
    const response = await retry(
      () => this.client.get('/api/v2/balance', {
        headers: this.getAuthHeaders(),
      }),
      { maxRetries: 2, baseDelay: 1000 }
    )
    
    return {
      balance: response.data.data.balance,
      currency: response.data.data.currency,
    }
  }
  
  async getPlans(service: ServiceType, network?: NetworkType): Promise<ServicePlan[]> {
    // VTU.NG public endpoint for data plans
    if (service === 'DATA') {
      const url = network 
        ? `/api/v2/variations/data?service_id=${network.toLowerCase()}`
        : '/api/v2/variations/data'
      
      const response = await retry(
        () => this.client.get(url),
        { maxRetries: 2, baseDelay: 1000 }
      )
      
      return response.data.data.map((plan: any) => ({
        id: plan.variation_id.toString(),
        name: plan.data_plan,
        network: plan.service_name.toUpperCase() as NetworkType,
        price: parseFloat(plan.price),
        isAvailable: plan.availability === 'Available',
        metadata: plan,
      }))
    }
    
    // TODO: Implement TV variations endpoint
    throw new Error(`VTU.NG: getPlans not implemented for ${service}`)
  }
  
  async verifyCustomer(payload: VerifyCustomerPayload): Promise<CustomerVerification> {
    await this.authenticate()
    
    const requestPayload: any = {
      customer_id: payload.customerId,
      service_id: payload.serviceProvider,
    }
    
    if (payload.meterType) {
      requestPayload.variation_id = payload.meterType.toLowerCase()
    }
    
    const response = await retry(
      () => this.client.post('/api/v2/verify-customer', requestPayload, {
        headers: this.getAuthHeaders(),
      }),
      { maxRetries: 2, baseDelay: 1000 }
    )
    
    return {
      isValid: response.data.code === 'success',
      customerName: response.data.data?.customer_name,
      address: response.data.data?.address,
      accountType: response.data.data?.meter_type || response.data.data?.account_type,
      metadata: response.data.data,
    }
  }
  
  async buyService(payload: PurchasePayload): Promise<VendorPurchaseResponse> {
    await this.authenticate()
    
    let endpoint = ''
    let requestPayload: any = {
      request_id: payload.idempotencyKey,
    }
    
    switch (payload.service) {
      case 'AIRTIME':
        endpoint = '/api/v2/airtime'
        requestPayload = {
          ...requestPayload,
          phone: payload.phone,
          service_id: payload.network.toLowerCase(),
          amount: payload.amount,
        }
        break
        
      case 'DATA':
        endpoint = '/api/v2/data'
        requestPayload = {
          ...requestPayload,
          phone: payload.phone,
          service_id: payload.network.toLowerCase(),
          variation_id: payload.planId,
        }
        break
        
      case 'ELECTRICITY':
        endpoint = '/api/v2/electricity'
        requestPayload = {
          ...requestPayload,
          meter_number: payload.customerId,
          service_id: payload.metadata?.serviceProvider,
          variation_id: payload.meterType?.toLowerCase(),
          amount: payload.amount,
          phone: payload.phone,
        }
        break
        
      // TODO: Add CABLE, BETTING, EPIN endpoints
        
      default:
        throw new Error(`VTU.NG: Service ${payload.service} not implemented`)
    }
    
    const response = await retry(
      () => this.client.post(endpoint, requestPayload, {
        headers: this.getAuthHeaders(),
      }),
      {
        maxRetries: 1,  // Don't retry purchases (idempotency handles it)
        baseDelay: 1000,
        shouldRetry: (error) => {
          // Only retry on 5xx errors
          const status = error.response?.status
          return status >= 500 && status < 600
        },
      }
    )
    
    const data = response.data
    const status = this.mapVendorStatus(data.data?.status || data.message)
    
    return {
      success: data.code === 'success',
      status,
      orderId: data.data?.order_id?.toString() || '',
      vendorReference: data.data?.order_id?.toString() || '',
      costPrice: parseFloat(data.data?.amount_charged || '0'),
      message: data.message,
      metadata: data.data,
    }
  }
  
  async queryTransaction(reference: string | number): Promise<TransactionStatus> {
    await this.authenticate()
    
    const response = await retry(
      () => this.client.post('/api/v2/requery', {
        request_id: reference,
      }, {
        headers: this.getAuthHeaders(),
      }),
      { maxRetries: 2, baseDelay: 1000 }
    )
    
    const status = this.mapVendorStatus(response.data.data?.status)
    
    return {
      status,
      reference: response.data.data?.order_id?.toString() || reference.toString(),
      message: response.data.message,
      metadata: response.data.data,
    }
  }
  
  private mapVendorStatus(vendorStatus: string): VendorTransactionStatus {
    const statusMap: Record<string, VendorTransactionStatus> = {
      'processing-api': 'PROCESSING',
      'completed-api': 'COMPLETED',
      'ORDER COMPLETED': 'COMPLETED',
      'refunded': 'REFUNDED',
      'ORDER REFUNDED': 'REFUNDED',
      'failed': 'FAILED',
      'ORDER FAILED': 'FAILED',
      'pending': 'PENDING',
      'ORDER PENDING': 'PENDING',
    }
    
    return statusMap[vendorStatus] || 'PENDING'
  }
}
```

---

## 4. Purchase Service Logic

```typescript
// lib/services/purchase.service.ts
import { prisma } from '@/lib/prisma'
import { VendorService } from '@/lib/vendors'
import { PricingService } from './pricing.service'
import { WalletService } from './wallet.service'
import { generateIdempotencyKey } from '@/lib/utils/idempotency'
import { BadRequestError, UnauthorizedError, PaymentRequiredError } from '@/lib/api-utils'

export interface PurchaseRequest {
  userId: string
  service: ServiceType
  network: NetworkType
  phone?: string
  amount?: number
  planId?: string
  customerId?: string
  meterType?: 'PREPAID' | 'POSTPAID'
  metadata?: Record<string, any>
}

export interface PurchaseResult {
  transaction: Transaction
  receipt: PurchaseReceipt
}

export interface PurchaseReceipt {
  transactionId: string
  status: string
  service: string
  network: string
  recipient: string
  amount: number
  costPrice: number
  sellingPrice: number
  profit: number
  vendorReference: string
  createdAt: Date
}

export class PurchaseService {
  constructor(
    private vendorService: VendorService,
    private pricingService: PricingService,
    private walletService: WalletService
  ) {}
  
  async purchase(request: PurchaseRequest): Promise<PurchaseResult> {
    // 1. Generate idempotency key
    const idempotencyKey = generateIdempotencyKey()
    
    // 2. Check for duplicate (idempotency)
    const existing = await prisma.transaction.findUnique({
      where: { idempotencyKey },
    })
    
    if (existing) {
      return {
        transaction: existing,
        receipt: this.buildReceipt(existing),
      }
    }
    
    // 3. Validate request
    this.validateRequest(request)
    
    // 4. Get vendor plan (for data/fixed services)
    let plan: ServicePlan | null = null
    if (request.planId) {
      plan = await this.vendorService.getPlan(
        request.service,
        request.network,
        request.planId
      )
      
      if (!plan || !plan.isAvailable) {
        throw new BadRequestError('Selected plan is not available')
      }
    }
    
    // 5. Calculate prices
    const costPrice = plan ? plan.price : (request.amount || 0)
    const { sellingPrice, profit, margin } = await this.pricingService.calculatePrice({
      service: request.service,
      network: request.network,
      costPrice,
      vendorName: null,  // Use global margin
    })
    
    // 6. Check wallet balance
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { credits: true },
    })
    
    if (!user || user.credits < sellingPrice) {
      throw new PaymentRequiredError(
        `Insufficient balance. Required: ₦${sellingPrice}, Available: ₦${user?.credits || 0}`
      )
    }
    
    // 7. Atomic DB transaction: Deduct wallet + Create transaction record
    const transaction = await prisma.$transaction(async (tx) => {
      // Deduct wallet
      await tx.user.update({
        where: { id: request.userId },
        data: { credits: { decrement: sellingPrice } },
      })
      
      // Create transaction record (PENDING)
      return await tx.transaction.create({
        data: {
          userId: request.userId,
          type: request.service,
          amount: costPrice,  // Face value
          status: 'PENDING',
          reference: `TXN-${Date.now()}`,
          idempotencyKey,
          costPrice,
          sellingPrice,
          profit,
          details: {
            network: request.network,
            phone: request.phone,
            planId: request.planId,
            planName: plan?.name,
            customerId: request.customerId,
            meterType: request.meterType,
            ...request.metadata,
          },
        },
      })
    })
    
    // 8. Call vendor API (async, don't block)
    this.callVendorAsync(transaction.id, request, idempotencyKey)
      .catch((error) => {
        console.error('Vendor call failed:', error)
        // Will be picked up by reconciliation job
      })
    
    return {
      transaction,
      receipt: this.buildReceipt(transaction),
    }
  }
  
  private async callVendorAsync(
    transactionId: string,
    request: PurchaseRequest,
    idempotencyKey: string
  ): Promise<void> {
    try {
      // Mark vendor call started
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'PROCESSING',
          vendorCallAt: new Date(),
        },
      })
      
      // Select vendor and call
      const result = await this.vendorService.buyService({
        service: request.service,
        network: request.network,
        phone: request.phone,
        amount: request.amount,
        planId: request.planId,
        customerId: request.customerId,
        meterType: request.meterType,
        idempotencyKey,
        metadata: request.metadata,
      })
      
      // Update transaction with vendor response
      const finalStatus = result.status === 'COMPLETED' ? 'SUCCESS' : result.status
      
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: finalStatus,
          vendorName: result.vendorName,
          vendorReference: result.vendorReference,
          vendorStatus: result.status,
          vendorResponse: result.metadata,
          vendorResponseAt: new Date(),
        },
      })
      
      // If failed, refund wallet
      if (result.status === 'FAILED' || result.status === 'REFUNDED') {
        await this.refundTransaction(transactionId)
      }
      
    } catch (error: any) {
      console.error('Vendor call error:', error)
      
      // Mark as FAILED and refund
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          vendorResponse: {
            error: error.message,
            stack: error.stack,
          },
          vendorResponseAt: new Date(),
        },
      })
      
      await this.refundTransaction(transactionId)
    }
  }
  
  private async refundTransaction(transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })
    
    if (!transaction) return
    
    await prisma.$transaction(async (tx) => {
      // Refund wallet
      await tx.user.update({
        where: { id: transaction.userId },
        data: { credits: { increment: transaction.sellingPrice } },
      })
      
      // Update transaction
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          profit: 0,  // No profit on failed transaction
        },
      })
    })
  }
  
  private validateRequest(request: PurchaseRequest): void {
    if (!request.service) {
      throw new BadRequestError('Service type is required')
    }
    
    if (!request.network && ['AIRTIME', 'DATA'].includes(request.service)) {
      throw new BadRequestError('Network is required for airtime/data purchases')
    }
    
    if (!request.phone && ['AIRTIME', 'DATA'].includes(request.service)) {
      throw new BadRequestError('Phone number is required')
    }
    
    if (!request.amount && !request.planId) {
      throw new BadRequestError('Either amount or planId is required')
    }
    
    if (request.service === 'DATA' && !request.planId) {
      throw new BadRequestError('Plan ID is required for data purchases')
    }
    
    if (['ELECTRICITY', 'CABLE'].includes(request.service) && !request.customerId) {
      throw new BadRequestError('Customer ID is required')
    }
  }
  
  private buildReceipt(transaction: Transaction): PurchaseReceipt {
    return {
      transactionId: transaction.id,
      status: transaction.status,
      service: transaction.type,
      network: (transaction.details as any)?.network || '',
      recipient: (transaction.details as any)?.phone || (transaction.details as any)?.customerId || '',
      amount: transaction.amount,
      costPrice: transaction.costPrice,
      sellingPrice: transaction.sellingPrice,
      profit: transaction.profit,
      vendorReference: transaction.vendorReference || '',
      createdAt: transaction.createdAt,
    }
  }
}
```

---

## 5. Pricing & Profit Rules

### Pricing Service Implementation
```typescript
// lib/services/pricing.service.ts
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface PriceCalculationRequest {
  service: ServiceType
  network?: NetworkType
  costPrice: number
  vendorName?: string | null
}

export interface PriceCalculationResult {
  costPrice: number
  sellingPrice: number
  profit: number
  margin: {
    type: 'FIXED' | 'PERCENTAGE'
    value: number
  }
}

export class PricingService {
  async calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResult> {
    // Find applicable profit margin (most specific first)
    const margin = await prisma.profitMargin.findFirst({
      where: {
        service: request.service,
        isActive: true,
        OR: [
          {
            vendorName: request.vendorName,
            network: request.network,
          },
          {
            vendorName: request.vendorName,
            network: null,
          },
          {
            vendorName: null,
            network: request.network,
          },
          {
            vendorName: null,
            network: null,
          },
        ],
        ...(request.costPrice && {
          OR: [
            { minAmount: null },
            { minAmount: { lte: request.costPrice } },
          ],
        }),
        ...(request.costPrice && {
          OR: [
            { maxAmount: null },
            { maxAmount: { gte: request.costPrice } },
          ],
        }),
      },
      orderBy: [
        { vendorName: 'desc' },  // Vendor-specific first
        { network: 'desc' },     // Network-specific second
        { createdAt: 'desc' },   // Newest first
      ],
    })
    
    if (!margin) {
      throw new Error(`No profit margin configured for ${request.service}`)
    }
    
    let profit = 0
    if (margin.marginType === 'FIXED') {
      profit = margin.marginValue.toNumber()
    } else {
      profit = (request.costPrice * margin.marginValue.toNumber()) / 100
    }
    
    const sellingPrice = request.costPrice + profit
    
    return {
      costPrice: request.costPrice,
      sellingPrice,
      profit,
      margin: {
        type: margin.marginType as 'FIXED' | 'PERCENTAGE',
        value: margin.marginValue.toNumber(),
      },
    }
  }
  
  async getMargins(service?: ServiceType): Promise<ProfitMargin[]> {
    return await prisma.profitMargin.findMany({
      where: service ? { service, isActive: true } : { isActive: true },
      orderBy: [
        { service: 'asc' },
        { vendorName: 'asc' },
        { network: 'asc' },
      ],
    })
  }
  
  async updateMargin(
    id: string,
    data: {
      marginType?: 'FIXED' | 'PERCENTAGE'
      marginValue?: number
      minAmount?: number | null
      maxAmount?: number | null
      isActive?: boolean
    }
  ): Promise<ProfitMargin> {
    return await prisma.profitMargin.update({
      where: { id },
      data,
    })
  }
}
```

### Default Profit Margins
| Service | Margin Type | Margin Value | Example |
|---------|------------|--------------|---------|
| DATA | FIXED | ₦100.00 | 1GB costs ₦499 → sell at ₦599 (₦100 profit) |
| AIRTIME | PERCENTAGE | 5% | ₦1000 airtime costs ₦970 → sell at ₦1018.50 (₦48.50 profit) |
| ELECTRICITY | FIXED | ₦50.00 | ₦5000 electricity costs ₦4925 → sell at ₦4975 (₦50 profit) |
| CABLE | FIXED | ₦50.00 | DStv Premium costs ₦21,000 → sell at ₦21,050 (₦50 profit) |
| BETTING | PERCENTAGE | 2% | ₦10,000 bet funding costs ₦9,980 → sell at ₦10,180 (₦200 profit) |
| EPIN | PERCENTAGE | 5% | ₦5000 ePIN costs ₦4,800 → sell at ₦5,040 (₦240 profit) |

**Admin can adjust margins per:**
- Service type (global)
- Service + Vendor (e.g., VTU.NG data has different margin than eBills data)
- Service + Network (e.g., MTN data has different margin than GLO data)
- Amount range (e.g., ₦100-₦1000 has 10% margin, ₦1001+ has 5% margin)

---

## 6. Error Handling & Idempotency

### Retry Logic with Exponential Backoff
```typescript
// lib/utils/retry.ts
export interface RetryOptions {
  maxRetries: number
  baseDelay: number  // in milliseconds
  maxDelay?: number
  shouldRetry?: (error: any) => boolean
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay = 30000, shouldRetry } = options
  
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error
      }
      
      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      )
      
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: error.message,
      })
      
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
```

### Idempotency Key Generation
```typescript
// lib/utils/idempotency.ts
import { v4 as uuidv4 } from 'uuid'
import { createHash } from 'crypto'

export function generateIdempotencyKey(): string {
  return uuidv4()
}

export function generateRequestId(data: {
  userId: string
  service: string
  timestamp: number
}): string {
  const hash = createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 32)  // VTU.NG max 50 chars, use 32 for safety
  
  return hash
}

export async function checkIdempotency(
  key: string
): Promise<Transaction | null> {
  return await prisma.transaction.findUnique({
    where: { idempotencyKey: key },
  })
}
```

### Error Response Handling
```typescript
// lib/vendors/error-handler.ts
export class VendorError extends Error {
  constructor(
    message: string,
    public vendorName: string,
    public statusCode: number,
    public vendorResponse: any
  ) {
    super(message)
    this.name = 'VendorError'
  }
}

export function handleVendorError(error: any, vendorName: string): never {
  const status = error.response?.status
  const data = error.response?.data
  
  // Map vendor error codes to user-friendly messages
  if (status === 400) {
    throw new VendorError(
      data?.message || 'Invalid request parameters',
      vendorName,
      400,
      data
    )
  }
  
  if (status === 402) {
    throw new VendorError(
      'Insufficient vendor balance. Please contact support.',
      vendorName,
      402,
      data
    )
  }
  
  if (status === 403) {
    throw new VendorError(
      'Vendor authentication failed',
      vendorName,
      403,
      data
    )
  }
  
  if (status === 409) {
    // Duplicate transaction (idempotency worked!)
    throw new VendorError(
      'Duplicate transaction detected',
      vendorName,
      409,
      data
    )
  }
  
  if (status >= 500) {
    throw new VendorError(
      'Vendor service temporarily unavailable',
      vendorName,
      status,
      data
    )
  }
  
  throw new VendorError(
    error.message || 'Unknown vendor error',
    vendorName,
    500,
    data
  )
}
```

---

## 7. Webhook & Reconciliation

### Webhook Handler (VTU.NG Example)
```typescript
// app/api/webhooks/vtu/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify webhook signature (if VTU.NG supports it)
    const signature = request.headers.get('X-VTU-Signature')
    if (signature && !verifySignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    const { order_id, status, request_id } = body
    
    // Find transaction by idempotency key or vendor reference
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { idempotencyKey: request_id },
          { vendorReference: order_id?.toString() },
        ],
      },
    })
    
    if (!transaction) {
      console.warn('Webhook: Transaction not found', { order_id, request_id })
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    
    // Map vendor status
    const mappedStatus = mapVendorStatus(status)
    
    // Update transaction
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: mappedStatus,
        vendorStatus: status,
        vendorResponse: body,
        vendorResponseAt: new Date(),
      },
    })
    
    // Refund if failed
    if (mappedStatus === 'FAILED' || mappedStatus === 'REFUNDED') {
      await refundTransaction(transaction.id)
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

function verifySignature(body: any, signature: string): boolean {
  const secret = process.env.VTU_WEBHOOK_SECRET || ''
  const hash = createHash('sha256')
    .update(JSON.stringify(body) + secret)
    .digest('hex')
  
  return hash === signature
}

function mapVendorStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'completed-api': 'SUCCESS',
    'ORDER COMPLETED': 'SUCCESS',
    'processing-api': 'PROCESSING',
    'failed': 'FAILED',
    'ORDER FAILED': 'FAILED',
    'refunded': 'FAILED',
    'ORDER REFUNDED': 'FAILED',
  }
  
  return statusMap[status] || 'PENDING'
}

async function refundTransaction(transactionId: string): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })
  
  if (!transaction) return
  
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: transaction.userId },
      data: { credits: { increment: transaction.sellingPrice } },
    })
    
    await tx.transaction.update({
      where: { id: transactionId },
      data: { profit: 0 },
    })
  })
}
```

### Reconciliation Cron Job
```typescript
// lib/services/reconciliation.service.ts
import { prisma } from '@/lib/prisma'
import { VendorService } from '@/lib/vendors'

export class ReconciliationService {
  constructor(private vendorService: VendorService) {}
  
  async reconcilePendingTransactions(): Promise<void> {
    console.log('[Reconciliation] Starting...')
    
    // Find transactions pending for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { lt: fiveMinutesAgo },
      },
      take: 50,  // Process in batches
    })
    
    console.log(`[Reconciliation] Found ${pendingTransactions.length} pending transactions`)
    
    for (const transaction of pendingTransactions) {
      try {
        await this.reconcileTransaction(transaction)
      } catch (error: any) {
        console.error(`[Reconciliation] Failed for ${transaction.id}:`, error.message)
      }
    }
    
    console.log('[Reconciliation] Completed')
  }
  
  private async reconcileTransaction(transaction: Transaction): Promise<void> {
    if (!transaction.idempotencyKey) {
      console.warn(`[Reconciliation] No idempotency key for ${transaction.id}`)
      return
    }
    
    // Query vendor for status
    const result = await this.vendorService.queryTransaction(
      transaction.idempotencyKey
    )
    
    console.log(`[Reconciliation] ${transaction.id} status: ${result.status}`)
    
    // Update transaction
    const mappedStatus = result.status === 'COMPLETED' ? 'SUCCESS' : result.status
    
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: mappedStatus,
        vendorStatus: result.status,
        vendorReference: result.reference,
        vendorResponse: result.metadata,
        vendorResponseAt: new Date(),
      },
    })
    
    // Refund if failed
    if (result.status === 'FAILED' || result.status === 'REFUNDED') {
      await this.refundTransaction(transaction.id)
    }
  }
  
  private async refundTransaction(transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })
    
    if (!transaction) return
    
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: transaction.userId },
        data: { credits: { increment: transaction.sellingPrice } },
      })
      
      await tx.transaction.update({
        where: { id: transactionId },
        data: { profit: 0 },
      })
    })
  }
}

// Cron job setup (using Vercel Cron or node-cron)
// app/api/cron/reconciliation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ReconciliationService } from '@/lib/services/reconciliation.service'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const reconciliationService = new ReconciliationService(vendorService)
  await reconciliationService.reconcilePendingTransactions()
  
  return NextResponse.json({ success: true })
}
```

---

## 8. Frontend Integration

### Purchase API Endpoint
```typescript
// app/api/services/purchase/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, getAuthenticatedUser } from '@/lib/api-utils'
import { PurchaseService } from '@/lib/services/purchase.service'
import { z } from 'zod'

const purchaseSchema = z.object({
  service: z.enum(['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'BETTING', 'EPIN']),
  network: z.enum(['MTN', 'GLO', 'AIRTEL', '9MOBILE', 'SMILE']).optional(),
  phone: z.string().optional(),
  amount: z.number().positive().optional(),
  planId: z.string().optional(),
  customerId: z.string().optional(),
  meterType: z.enum(['PREPAID', 'POSTPAID']).optional(),
  metadata: z.record(z.any()).optional(),
})

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await getAuthenticatedUser()
  const data = purchaseSchema.parse(await request.json())
  
  const purchaseService = new PurchaseService(vendorService, pricingService, walletService)
  
  const result = await purchaseService.purchase({
    userId: user.id,
    ...data,
  })
  
  return {
    transaction: {
      id: result.transaction.id,
      status: result.transaction.status,
      reference: result.transaction.reference,
      createdAt: result.transaction.createdAt,
    },
    receipt: result.receipt,
  }
})
```

### React Component Example (Data Purchase)
```typescript
// app/(protected)/dashboard/services/data/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface DataPlan {
  id: string
  name: string
  network: string
  price: number
  sellingPrice: number
}

export default function DataPurchasePage() {
  const { data: session } = useSession()
  const [network, setNetwork] = useState<string>('MTN')
  const [phone, setPhone] = useState<string>('')
  const [plans, setPlans] = useState<DataPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch plans when network changes
  useEffect(() => {
    if (network) {
      fetchPlans(network)
    }
  }, [network])
  
  async function fetchPlans(network: string) {
    try {
      setLoading(true)
      const response = await fetch(`/api/services/plans?service=DATA&network=${network}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch plans')
      }
      
      const data = await response.json()
      setPlans(data.plans)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  async function handlePurchase() {
    if (!selectedPlan || !phone) {
      setError('Please select a plan and enter phone number')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/services/purchase', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'DATA',
          network,
          phone,
          planId: selectedPlan,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Purchase failed')
      }
      
      const result = await response.json()
      
      // Show success modal with receipt
      alert(`Purchase successful! Reference: ${result.transaction.reference}`)
      
      // Reset form
      setPhone('')
      setSelectedPlan(null)
      
    } catch (error: any) {
      if (error.message.includes('Insufficient balance')) {
        setError('Insufficient wallet balance. Please fund your wallet.')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Buy Data</h1>
      
      {/* Network Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Network</label>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="MTN">MTN</option>
          <option value="GLO">Glo</option>
          <option value="AIRTEL">Airtel</option>
          <option value="9MOBILE">9mobile</option>
        </select>
      </div>
      
      {/* Phone Number */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="08012345678"
          className="w-full p-2 border rounded"
        />
      </div>
      
      {/* Plans */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Plan</label>
        {loading && <p>Loading plans...</p>}
        {!loading && plans.length === 0 && <p>No plans available</p>}
        {!loading && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-4 border rounded text-left ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <div className="font-medium">{plan.name}</div>
                <div className="text-sm text-gray-600">
                  ₦{plan.sellingPrice.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
          {error.includes('Insufficient balance') && (
            <a href="/dashboard/wallet" className="ml-2 underline">
              Fund Wallet
            </a>
          )}
        </div>
      )}
      
      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={loading || !selectedPlan || !phone}
        className="w-full py-3 bg-blue-600 text-white rounded disabled:bg-gray-300"
      >
        {loading ? 'Processing...' : 'Purchase'}
      </button>
    </div>
  )
}
```

---

## 9. Admin Tools

### Vendor Balance Monitoring
```typescript
// app/api/admin/vendors/balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, getAuthenticatedUser } from '@/lib/api-utils'
import { VendorService } from '@/lib/vendors'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getAuthenticatedUser()
  
  // Check admin role
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  const vendorService = new VendorService()
  
  const balances = await Promise.all([
    vendorService.getBalance('VTU_NG').catch(() => ({ vendor: 'VTU_NG', error: 'Failed' })),
    vendorService.getBalance('EBILLS').catch(() => ({ vendor: 'EBILLS', error: 'Failed' })),
    vendorService.getBalance('CLUBKONNECT').catch(() => ({ vendor: 'CLUBKONNECT', error: 'Failed' })),
  ])
  
  return { balances }
})
```

### Profit Report
```typescript
// app/api/admin/reports/profit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, getAuthenticatedUser } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getAuthenticatedUser()
  
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  const where: any = {
    status: 'SUCCESS',
  }
  
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  }
  
  // Aggregate profit by service
  const profitByService = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: {
      profit: true,
      sellingPrice: true,
      costPrice: true,
    },
    _count: true,
  })
  
  // Aggregate profit by vendor
  const profitByVendor = await prisma.transaction.groupBy({
    by: ['vendorName'],
    where: {
      ...where,
      vendorName: { not: null },
    },
    _sum: {
      profit: true,
    },
    _count: true,
  })
  
  // Total profit
  const totalProfit = profitByService.reduce(
    (sum, item) => sum + (item._sum.profit?.toNumber() || 0),
    0
  )
  
  return {
    totalProfit,
    profitByService,
    profitByVendor,
  }
})
```

---

## 10. Testing Strategy

### Unit Tests (Jest)
```typescript
// __tests__/services/pricing.service.test.ts
import { PricingService } from '@/lib/services/pricing.service'
import { prisma } from '@/lib/prisma'

describe('PricingService', () => {
  let pricingService: PricingService
  
  beforeEach(() => {
    pricingService = new PricingService()
  })
  
  describe('calculatePrice', () => {
    it('should apply FIXED margin correctly', async () => {
      // Mock Prisma
      jest.spyOn(prisma.profitMargin, 'findFirst').mockResolvedValue({
        id: '1',
        service: 'DATA',
        marginType: 'FIXED',
        marginValue: 100,
        vendorName: null,
        network: null,
        minAmount: null,
        maxAmount: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      const result = await pricingService.calculatePrice({
        service: 'DATA',
        costPrice: 499,
      })
      
      expect(result.costPrice).toBe(499)
      expect(result.profit).toBe(100)
      expect(result.sellingPrice).toBe(599)
      expect(result.margin.type).toBe('FIXED')
      expect(result.margin.value).toBe(100)
    })
    
    it('should apply PERCENTAGE margin correctly', async () => {
      jest.spyOn(prisma.profitMargin, 'findFirst').mockResolvedValue({
        id: '2',
        service: 'AIRTIME',
        marginType: 'PERCENTAGE',
        marginValue: 5,
        vendorName: null,
        network: null,
        minAmount: null,
        maxAmount: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      const result = await pricingService.calculatePrice({
        service: 'AIRTIME',
        costPrice: 1000,
      })
      
      expect(result.costPrice).toBe(1000)
      expect(result.profit).toBe(50)  // 5% of 1000
      expect(result.sellingPrice).toBe(1050)
    })
    
    it('should throw error if no margin configured', async () => {
      jest.spyOn(prisma.profitMargin, 'findFirst').mockResolvedValue(null)
      
      await expect(
        pricingService.calculatePrice({
          service: 'DATA',
          costPrice: 499,
        })
      ).rejects.toThrow('No profit margin configured')
    })
  })
})
```

### Integration Tests
```typescript
// __tests__/api/services/purchase.test.ts
import { POST } from '@/app/api/services/purchase/route'
import { prisma } from '@/lib/prisma'

describe('POST /api/services/purchase', () => {
  it('should purchase data successfully', async () => {
    // Mock authenticated user
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      credits: 1000,
    }
    
    // Mock request
    const request = new Request('http://localhost/api/services/purchase', {
      method: 'POST',
      body: JSON.stringify({
        service: 'DATA',
        network: 'MTN',
        phone: '08012345678',
        planId: '1gb-30days',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.transaction.status).toBe('PENDING')
    expect(data.receipt.sellingPrice).toBeGreaterThan(0)
  })
  
  it('should reject purchase with insufficient balance', async () => {
    // Mock user with low balance
    const mockUser = {
      id: 'user-123',
      credits: 10,  // Not enough
    }
    
    const request = new Request('http://localhost/api/services/purchase', {
      method: 'POST',
      body: JSON.stringify({
        service: 'DATA',
        network: 'MTN',
        phone: '08012345678',
        planId: '1gb-30days',
      }),
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(402)
    expect(data.error).toContain('Insufficient balance')
  })
})
```

### E2E Tests (Playwright)
```typescript
// e2e/data-purchase.spec.ts
import { test, expect } from '@playwright/test'

test('complete data purchase flow', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Fund wallet
  await page.goto('/dashboard/wallet')
  await page.click('text=Fund Wallet')
  await page.fill('input[name="amount"]', '1000')
  // ... complete Paystack flow ...
  
  // Buy data
  await page.goto('/dashboard/services/data')
  await page.selectOption('select[name="network"]', 'MTN')
  await page.fill('input[name="phone"]', '08012345678')
  await page.click('text=1GB - 30 Days')
  await page.click('button:has-text("Purchase")')
  
  // Verify success
  await expect(page.locator('text=Purchase successful')).toBeVisible()
  
  // Check transaction history
  await page.goto('/dashboard/transactions')
  await expect(page.locator('text=DATA')).toBeVisible()
  await expect(page.locator('text=SUCCESS')).toBeVisible()
})
```

---

## 11. Deployment Checklist

### Pre-Deployment
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing in staging
- [ ] Security audit completed (no exposed secrets, proper validation)
- [ ] Database migration tested on staging
- [ ] Vendor credentials added to production environment variables
- [ ] Webhook endpoints configured with vendors
- [ ] Cron job set up for reconciliation (Vercel Cron or external)
- [ ] Sentry error monitoring configured
- [ ] Rate limiting configured on API endpoints
- [ ] CORS configured for mobile app

### Environment Variables (Production)
```bash
# Database
DATABASE_URL="postgresql://..."

# Vendors
VTU_NG_USERNAME="your-username"
VTU_NG_PASSWORD="your-password"
EBILLS_USERNAME="your-username"
EBILLS_PASSWORD="your-password"
CLUBKONNECT_USER_ID="your-user-id"
CLUBKONNECT_API_KEY="your-api-key"

# Webhooks
VTU_WEBHOOK_SECRET="generate-random-secret"
EBILLS_WEBHOOK_SECRET="generate-random-secret"
CLUBKONNECT_WEBHOOK_SECRET="generate-random-secret"

# Cron
CRON_SECRET="generate-random-secret"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

### Deployment Steps
1. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Seed Profit Margins**
   ```bash
   npx prisma db seed
   ```

3. **Test Vendor Connections**
   ```bash
   curl https://your-domain.com/api/admin/vendors/balance \
     -H "Authorization: Bearer admin-token"
   ```

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

5. **Configure Webhooks**
   - VTU.NG: https://your-domain.com/api/webhooks/vtu
   - eBills: https://your-domain.com/api/webhooks/ebills
   - ClubKonnect: https://your-domain.com/api/webhooks/clubkonnect

6. **Set Up Cron Job (Vercel Cron)**
   ```json
   // vercel.json
   {
     "crons": [{
       "path": "/api/cron/reconciliation",
       "schedule": "*/5 * * * *"
     }]
   }
   ```

7. **Monitor First Transactions**
   - Test small airtime purchase (₦100)
   - Test data purchase (500MB)
   - Verify webhook updates
   - Check reconciliation job logs

### Rollback Plan
- Keep previous deployment active on separate URL
- Database migration rollback script ready
- Can switch traffic instantly via Vercel deployment URL
- Vendor API calls are idempotent (safe to retry)

### Post-Deployment Monitoring
- [ ] Check Sentry for errors
- [ ] Monitor vendor balance daily
- [ ] Review profit margins weekly
- [ ] Check reconciliation job logs
- [ ] Monitor failed transaction rate
- [ ] Review user feedback

---

## Summary

This implementation plan provides:

1. **Architecture** - Vendor Adapter Pattern with 3 vendor implementations
2. **Database** - New transaction fields for vendor tracking and profit calculation
3. **Pricing** - Flexible profit margin system (fixed or percentage)
4. **Error Handling** - Retry logic, idempotency, proper error responses
5. **Reliability** - Webhooks and reconciliation cron for transaction updates
6. **Admin Tools** - Vendor balance monitoring, profit reporting, manual retry
7. **Testing** - Unit, integration, and E2E test strategies
8. **Deployment** - Complete checklist with environment variables and rollback plan

**Estimated Timeline:** 12 days
- Days 1-2: Foundation (adapters, services, database)
- Days 3-4: Core services (airtime, data)
- Days 5-6: Advanced services (electricity, cable, betting, ePINs)
- Days 7-8: Reliability (webhooks, reconciliation)
- Days 9-10: Frontend integration
- Days 11-12: Testing and deployment

**Next Step:** Obtain vendor test credentials and begin Phase 1 implementation.
