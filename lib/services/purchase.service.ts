/**
 * Purchase Service
 * 
 * Main orchestrator for all purchase operations.
 * Handles the complete purchase flow: validation, pricing, wallet operations,
 * vendor API calls, transaction recording, and automatic refunds.
 */

import { prisma } from '../prisma'
import { vendorService } from '../vendors'
import { pricingService } from './pricing.service'
import { notificationService } from './NotificationService'
import { generateReference } from '../api-utils'
import { generateIdempotencyKey } from '../utils/idempotency'
import { normalizePhone, detectNetwork } from '../utils/phone-normalizer'
import {
  ServiceType,
  NetworkType,
  PurchasePayload,
  VendorPurchaseResponse
} from '../vendors/adapter.interface'

export interface PurchaseRequest {
  userId: string
  service: ServiceType
  network?: NetworkType
  recipient: string // phone number or account number
  amount?: number // for airtime
  planId?: string // for data bundles, cable, etc.
  dataPlanPrice?: number // Optional: Override selling price (e.g. from DB Plan)
  idempotencyKey?: string // optional: auto-generated if not provided
  targetVendor?: string // Optional: Force usage of a specific vendor
  costPrice?: number // Optional: Override cost price (for vendors without dynamic plan API)
  metadata?: Record<string, any>
}

export interface PurchaseResponse {
  success: boolean
  transaction: {
    id: string
    reference: string
    vendorReference?: string | null
    service: ServiceType
    network?: NetworkType
    recipient: string
    amount: number
    costPrice: number
    sellingPrice: number
    profit: number
    status: string
    vendorStatus?: string | null
    vendorName?: string | null
    createdAt: Date
  }
  receipt: {
    customerName: string
    service: string
    network?: string
    recipient: string
    amount: string
    fee: string
    total: string
    date: string
    reference: string
  }
  message: string
}

export class PurchaseService {
  /**
   * Main purchase method - orchestrates the complete purchase flow
   */
  async purchase(request: PurchaseRequest): Promise<PurchaseResponse> {
    // 1. Generate or use provided idempotency key
    const idempotencyKey = request.idempotencyKey || generateIdempotencyKey()

    // 2. Check for duplicate transaction
    const existingTransaction = await this.checkDuplicate(idempotencyKey)
    if (existingTransaction) {
      return this.formatResponse(existingTransaction, 'Duplicate request - transaction already exists')
    }

    // 3. Validate request
    await this.validateRequest(request)

    // 4. Normalize phone number (if applicable)
    const normalizedRecipient = this.normalizeRecipient(request)

    // 5. Auto-detect network if not provided (for phone-based services)
    const network = await this.detectNetwork(request, normalizedRecipient)

    // 6. Get vendor plan details (if planId provided)
    const planDetails = await this.getPlanDetails(request)

    // 7. Determine cost price (from plan or request amount)
    const costPrice = planDetails?.price || request.amount || 0

    if (costPrice <= 0) {
      throw new Error('Invalid amount or plan')
    }

    // 8. Calculate pricing (cost + profit margin)
    let pricing

    // Priority 1: Use DB Plan price if provided
    if (request.dataPlanPrice) {
      pricing = {
        costPrice,
        sellingPrice: request.dataPlanPrice,
        profit: request.dataPlanPrice - costPrice,
        margin: { type: 'FIXED', value: request.dataPlanPrice - costPrice },
      }
    } 
    // Priority 2: Special case: AIRTIME and ELECTRICITY use 1:1 pricing (Amount = Cost),
    // no profit added — the user specifies the exact face value they want
    else if (request.service === 'AIRTIME' || request.service === 'ELECTRICITY') {
      pricing = {
        costPrice,
        sellingPrice: costPrice, // 1:1 pricing
        profit: 0,
        margin: { type: 'FIXED', value: 0 },
      }
    } else {
      try {
        pricing = await pricingService.calculatePrice({
          service: request.service,
          network,
          costPrice,
          vendorName: null, // Will be set by vendor service
        })
      } catch (err: any) {
        // If no profit margin configured, fallback to fixed ₦100 margin to ensure purchases can proceed
        if (err.message && err.message.includes('No profit margin')) {
          const fallbackProfit = 100
          pricing = {
            costPrice,
            sellingPrice: costPrice + fallbackProfit,
            profit: fallbackProfit,
            margin: { type: 'FIXED', value: fallbackProfit },
          }
        } else {
          throw err
        }
      }
    }

    // 9. Get user and check wallet balance
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        credits: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.credits < pricing.sellingPrice) {
      throw new Error(
        `Insufficient balance. Required: ₦${pricing.sellingPrice}, Available: ₦${user.credits}`
      )
    }

    // 10. Create transaction and deduct wallet in atomic operation
    const transaction = await this.createTransactionAndDeductWallet(
      user.id,
      {
        type: request.service,
        network: network || null,
        recipient: normalizedRecipient,
        amount: pricing.sellingPrice,
        costPrice: pricing.costPrice,
        sellingPrice: pricing.sellingPrice,
        profit: pricing.profit,
        status: 'PENDING',
        idempotencyKey,
        reference: generateReference(request.service),
        details: request.metadata || {},
      },
      pricing.sellingPrice
    )

    // 11. Call vendor API asynchronously (don't block response)
    this.processPurchaseAsync(transaction.id, {
      service: request.service,
      network: network || 'MTN',
      phone: ['AIRTIME', 'DATA'].includes(request.service)
        ? normalizedRecipient
        : undefined,
      customerId: ['ELECTRICITY', 'CABLE', 'CABLE_TV', 'BETTING'].includes(request.service)
        ? normalizedRecipient
        : undefined,
      amount: pricing.costPrice,
      planId: request.planId,
      idempotencyKey,
      targetVendor:      request.targetVendor,
      fallbackPlanDbId:  request.metadata?.fallbackPlanDbId,
      metadata: {
        ...request.metadata,
        transactionId: transaction.id,
        userId:        user.id,
      },
    })

    // 12. Return response immediately
    return this.formatResponse(
      transaction,
      'Purchase initiated successfully. You will be notified when completed.'
    )
  }

  /**
   * Detect whether an error is an INSUFFICIENT VENDOR BALANCE error
   * (i.e. the vendor's own wallet is low — NOT the user's balance)
   */
  private isVendorBalanceError(error: any): boolean {
    if (error?.name !== 'VendorError') return false
    const msg: string = (error?.message || '').toLowerCase()
    return (
      msg.includes('insufficient balance') ||
      msg.includes('insufficient fund') ||
      msg.includes('low balance') ||
      msg.includes('wallet balance')
    )
  }

  /**
   * Process vendor purchase asynchronously.
   *
   * On vendor-side insufficient balance, automatically retries with the next
   * available vendor plan (same network/size/type/validity) without creating
   * a new wallet deduction — reuses the same transaction record.
   */
  private async processPurchaseAsync(
    transactionId: string,
    payload: PurchasePayload
  ): Promise<void> {
    const triedVendors = new Set<string>()
    if (payload.targetVendor) triedVendors.add(payload.targetVendor)

    let currentPayload = payload

    while (true) {
      try {
        const result = await vendorService.buyService(currentPayload)

        // Update transaction with vendor response
        const updatedTx = await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: this.mapVendorStatusToLocal(result.status),
            vendorName: result.vendorName,
            vendorReference: result.vendorReference,
            vendorStatus: result.status,
            vendorResponse: { message: result.message, ...result.metadata },
            vendorCallAt: new Date(),
            vendorResponseAt: new Date(),
          },
          select: { userId: true, sellingPrice: true, type: true },
        })

        if (result.status === 'FAILED') {
          await this.refundTransaction(transactionId)
          notificationService.notifyUser(
            updatedTx.userId,
            'Purchase Failed',
            `Your ₦${updatedTx.sellingPrice.toLocaleString()} ${this.formatServiceName(updatedTx.type)} purchase could not be completed. Amount refunded to wallet.`,
            'TRANSACTION',
            { transactionId, type: 'TRANSACTION', refund: true }
          ).catch((e: any) => console.error('[Notification] purchase failed:', e.message))
        } else {
          notificationService.notifyUser(
            updatedTx.userId,
            'Purchase Successful',
            `Your ₦${updatedTx.sellingPrice.toLocaleString()} ${this.formatServiceName(updatedTx.type)} purchase is complete`,
            'TRANSACTION',
            { transactionId, type: 'TRANSACTION' }
          ).catch((e: any) => console.error('[Notification] purchase success:', e.message))
        }
        return // success or terminal failure — stop looping

      } catch (error: any) {
        const isBalanceError = this.isVendorBalanceError(error)

        if (isBalanceError && payload.fallbackPlanDbId) {
          // ── Vendor balance failover ──────────────────────────────────────
          // Look up the original plan to get its specs
          const originalPlan = await prisma.dataPlan.findUnique({
            where: { id: payload.fallbackPlanDbId },
            select: { size: true, planType: true, validity: true, network: true },
          })

          if (originalPlan) {
            // Find next enabled vendor that has an identical plan
            const nextPlan = await prisma.dataPlan.findFirst({
              where: {
                network:   originalPlan.network,
                size:      originalPlan.size,
                planType:  originalPlan.planType,
                validity:  originalPlan.validity,
                isActive:  true,
                vendor: {
                  isEnabled: true,
                  adapterId: { notIn: Array.from(triedVendors) },
                },
              },
              orderBy: [
                { vendor: { isPrimary: 'desc' } },
                { costPrice: 'asc' },
              ],
              include: { vendor: true },
            })

            if (nextPlan) {
              console.warn(
                `[Failover] Vendor ${currentPayload.targetVendor} has insufficient balance. ` +
                `Switching to ${nextPlan.vendor.adapterId} (plan ${nextPlan.id})`
              )
              triedVendors.add(nextPlan.vendor.adapterId)
              currentPayload = {
                ...currentPayload,
                planId:       nextPlan.planId,
                targetVendor: nextPlan.vendor.adapterId,
                amount:       nextPlan.costPrice,
                // fresh idempotency key so the new vendor call isn't deduped
                idempotencyKey: `${payload.idempotencyKey}_fo${triedVendors.size}`,
                metadata: {
                  ...currentPayload.metadata,
                  failoverVendor:  nextPlan.vendor.adapterId,
                  failoverPlanId:  nextPlan.id,
                  failoverReason:  error.message,
                },
              }
              continue // retry loop with new vendor
            }
          }

          // No more fallback vendors available
          console.error(
            `[Failover] All vendors exhausted (tried: ${Array.from(triedVendors).join(', ')}). ` +
            `Marking transaction ${transactionId} as failed.`
          )
        } else {
          console.error('Vendor purchase failed:', error)
        }

        // ── Terminal failure ─────────────────────────────────────────────
        const failedTx = await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'FAILED',
            vendorResponse: {
              error:     error.message,
              triedVendors: Array.from(triedVendors),
              timestamp: new Date().toISOString(),
            },
            vendorCallAt:     new Date(),
            vendorResponseAt: new Date(),
          },
          select: { userId: true, sellingPrice: true, type: true },
        })

        await this.refundTransaction(transactionId)
        notificationService.notifyUser(
          failedTx.userId,
          'Purchase Failed',
          `Your ₦${failedTx.sellingPrice.toLocaleString()} ${this.formatServiceName(failedTx.type)} purchase could not be completed. Amount refunded to wallet.`,
          'TRANSACTION',
          { transactionId, type: 'TRANSACTION', refund: true }
        ).catch((e: any) => console.error('[Notification] terminal failure:', e.message))
        return
      }
    }
  }

  /**
   * Check for duplicate transaction by idempotency key
   */
  private async checkDuplicate(idempotencyKey: string): Promise<any | null> {
    return await prisma.transaction.findUnique({
      where: { idempotencyKey },
    })
  }

  /**
   * Validate purchase request
   */
  private async validateRequest(request: PurchaseRequest): Promise<void> {
    if (!request.userId) {
      throw new Error('User ID is required')
    }

    if (!request.service) {
      throw new Error('Service type is required')
    }

    if (!request.recipient) {
      throw new Error('Recipient is required')
    }

    // Service-specific validation
    if (request.service === 'AIRTIME' && !request.amount) {
      throw new Error('Amount is required for airtime purchase')
    }

    if (request.service === 'ELECTRICITY' && !request.amount) {
      throw new Error('Amount is required for electricity purchase')
    }

    if (
      ['DATA', 'CABLE', 'CABLE_TV', 'BETTING', 'EPINS'].includes(request.service) &&
      !request.planId
    ) {
      throw new Error(`Plan ID is required for ${request.service} purchase`)
    }
  }

  /**
   * Normalize recipient based on service type
   */
  private normalizeRecipient(request: PurchaseRequest): string {
    // Phone-based services
    if (['AIRTIME', 'DATA'].includes(request.service)) {
      return normalizePhone(request.recipient)
    }

    // Account-based services (cable, electricity, betting)
    return request.recipient.trim()
  }

  /**
   * Detect network from phone number
   */
  private async detectNetwork(
    request: PurchaseRequest,
    normalizedRecipient: string
  ): Promise<NetworkType | undefined> {
    if (request.network) {
      return request.network
    }

    // Auto-detect for phone-based services
    if (['AIRTIME', 'DATA'].includes(request.service)) {
      const detectedNetwork = detectNetwork(normalizedRecipient)
      if (!detectedNetwork || detectedNetwork === 'UNKNOWN') {
        throw new Error('Could not detect network from phone number')
      }
      return detectedNetwork as NetworkType
    }

    return undefined
  }

  /**
   * Get plan details from vendor
   */
  private async getPlanDetails(
    request: PurchaseRequest
  ): Promise<{ price: number; name: string } | null> {
    if (!request.planId) {
      return null
    }

    try {
      // Pass targetVendor if present, otherwise let it route automatically
      const plans = await vendorService.getPlans(
        request.service,
        request.network,
        request.targetVendor
      )

      const plan = plans.find((p) => p.id === request.planId)
      if (!plan) {
        // Special case: If vendor does not support plan listing (returns empty),
        // we must trust the DB costPrice if provided.
        // Specifically for SubAndGain which returns empty array.
        if (plans.length === 0 && request.costPrice !== undefined) {
             return {
                 price: request.costPrice,
                 name: request.metadata?.planName || 'Data Plan'
             }
        }
        
        throw new Error('Plan not found')
      }

      return {
        price: plan.price,
        name: plan.name,
      }
    } catch (error: any) {
      throw new Error(`Failed to get plan details: ${error.message}`)
    }
  }

  /**
   * Create transaction and deduct wallet balance in atomic operation
   */
  private async createTransactionAndDeductWallet(
    userId: string,
    transactionData: any,
    deductAmount: number
  ): Promise<any> {
    // Use Prisma transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // 1. Deduct from wallet (credits)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: deductAmount,
          },
        },
        select: {
          credits: true,
        },
      })

      // Double-check balance (should never be negative due to check before)
      if (updatedUser.credits < 0) {
        throw new Error('Insufficient balance')
      }

      // 2. Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          ...transactionData,
          userId,
        },
      })

      return transaction
    }, {
      maxWait: 10000, // Wait up to 10s for a connection
      timeout: 20000, // Allow transaction to run for up to 20s (fixes "Transaction already closed" on slow DBs)
    })
  }

  /**
   * Refund transaction to user wallet
   */
  private async refundTransaction(transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        userId: true,
        sellingPrice: true,
        status: true,
      },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    if (transaction.status === 'CANCELLED') {
      return // Already refunded (CANCELLED is the refund state)
    }

    // Refund in atomic operation
    await prisma.$transaction(async (tx) => {
      // 1. Update transaction status
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'CANCELLED',
        },
      })

      // 2. Credit wallet (credits)
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          credits: {
            increment: transaction.sellingPrice,
          },
        },
      })
    }, {
      maxWait: 10000,
      timeout: 20000,
    })
  }

  /**
   * Map vendor status to local transaction status
   */
  private mapVendorStatusToLocal(vendorStatus: string): 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'COMPLETED' {
    switch (vendorStatus) {
      case 'COMPLETED':
        return 'COMPLETED'
      case 'PROCESSING':
      case 'PENDING':
        return 'PENDING'
      case 'FAILED':
        return 'FAILED'
      case 'REFUNDED':
        return 'CANCELLED'
      default:
        return 'PENDING'
    }
  }

  /**
   * Format response for client
   */
  private formatResponse(transaction: any, message: string): PurchaseResponse {
    return {
      success: transaction.status !== 'FAILED',
      transaction: {
        id: transaction.id,
        reference: transaction.reference,
        vendorReference: transaction.vendorReference,
        service: transaction.type,
        network: transaction.network,
        recipient: transaction.recipient,
        amount: transaction.amount,
        costPrice: transaction.costPrice || transaction.amount,
        sellingPrice: transaction.sellingPrice || transaction.amount,
        profit: transaction.profit || 0,
        status: transaction.status,
        vendorStatus: transaction.vendorStatus,
        vendorName: transaction.vendorName,
        createdAt: transaction.createdAt,
      },
      receipt: {
        customerName: 'Customer', // TODO: Get from user
        service: this.formatServiceName(transaction.type),
        network: transaction.network,
        recipient: transaction.recipient,
        amount: `₦${transaction.amount.toLocaleString()}`,
        fee: `₦${transaction.profit?.toLocaleString() || '0'}`,
        total: `₦${(transaction.sellingPrice || transaction.amount).toLocaleString()}`,
        date: new Date(transaction.createdAt).toLocaleString(),
        reference: transaction.reference,
      },
      message,
    }
  }

  /**
   * Format service name for display
   */
  private formatServiceName(service: string): string {
    const names: Record<string, string> = {
      AIRTIME: 'Airtime',
      DATA: 'Data Bundle',
      CABLE: 'Cable TV',
      ELECTRICITY: 'Electricity',
      BETTING: 'Betting',
      EPINS: 'E-PIN',
    }
    return names[service] || service
  }

  /**
   * Query transaction status from vendor
   */
  async queryTransactionStatus(transactionId: string): Promise<any> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    if (!transaction.vendorName || !transaction.vendorReference) {
      return {
        status: transaction.status,
        message: 'Transaction not yet sent to vendor',
      }
    }

    try {
      // Query vendor for updated status
      const result = await vendorService.queryTransaction(
        transaction.vendorReference
      )

      // Update transaction with latest status
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: this.mapVendorStatusToLocal(result.status),
          vendorStatus: result.status,
          vendorResponse: { message: result.message },
        },
      })

      // Refund if failed
      if (result.status === 'FAILED' && transaction.status !== 'CANCELLED') {
        await this.refundTransaction(transactionId)
      }

      return {
        status: updatedTransaction.status,
        vendorStatus: result.status,
        message: result.message || 'Status retrieved successfully',
      }
    } catch (error: any) {
      throw new Error(`Failed to query transaction: ${error.message}`)
    }
  }

  /**
   * Get user transaction history
   */
  async getTransactionHistory(
    userId: string,
    options?: {
      service?: ServiceType
      status?: string
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    }
  ): Promise<{
    transactions: any[]
    total: number
  }> {
    const where: any = { userId }

    if (options?.service) {
      where.type = options.service
    }

    if (options?.status) {
      where.status = options.status
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {}
      if (options.startDate) where.createdAt.gte = options.startDate
      if (options.endDate) where.createdAt.lte = options.endDate
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.transaction.count({ where }),
    ])

    return {
      transactions,
      total,
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<any> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    return transaction
  }
}

// Export singleton instance
export const purchaseService = new PurchaseService()
