/**
 * Data Purchase API
 * POST - Purchase data bundle using Amigo as primary vendor
 * Features:
 * - PIN verification before purchase
 * - Automatic profit margin (₦100) applied
 * - Wallet balance validation
 * - Atomic transaction + wallet deduction
 * - Automatic refund on failure
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth'
import { purchaseService } from '@/lib/services/purchase.service'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
  InsufficientBalanceError,
  validateNigerianPhone,
  formatNigerianPhone,
} from '@/lib/api-utils'

// Data purchase validation schema
const dataPurchaseSchema = z.object({
  network: z.enum(['MTN', 'GLO', 'AIRTEL', '9MOBILE'], {
    errorMap: () => ({ message: 'Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE' }),
  }),
  phone: z.string().min(11, 'Phone number is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  pin: z.string().min(4, 'Transaction PIN is required').max(6, 'PIN must be 4-6 digits'),
  idempotencyKey: z.string().optional(),
})

const PROFIT_MARGIN = 100 // ₦100 profit per bundle

/**
 * POST /api/data/purchase
 * Purchase data bundle with PIN verification
 * Body: { network, phone, planId, pin, idempotencyKey? }
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, dataPurchaseSchema)) as z.infer<typeof dataPurchaseSchema>

  // ========================================
  // 1. Validate Phone Number
  // ========================================
  if (!validateNigerianPhone(data.phone)) {
    throw new BadRequestError('Invalid Nigerian phone number format')
  }

  const formattedPhone = formatNigerianPhone(data.phone)

  // ========================================
  // 2. Verify Transaction PIN
  // ========================================
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      pinHash: true,
      credits: true,
    },
  })

  if (!dbUser) {
    throw new BadRequestError('User not found')
  }

  if (!dbUser.pinHash) {
    throw new BadRequestError(
      'Transaction PIN not set. Please create a PIN in your profile settings before making purchases.'
    )
  }

  const isPinValid = await comparePassword(data.pin, dbUser.pinHash)
  if (!isPinValid) {
    throw new BadRequestError('Incorrect PIN. Please try again.')
  }

  // ========================================
  // 3. Get Plan Details from Vendor (Amigo)
  // ========================================
  const { vendorService } = await import('@/lib/vendors')
  const plans = await vendorService.getPlans('DATA', data.network)
  const selectedPlan = plans.find(p => p.id === data.planId)

  if (!selectedPlan) {
    throw new BadRequestError('Selected plan not found or unavailable')
  }

  if (!selectedPlan.isAvailable) {
    throw new BadRequestError('Selected plan is currently unavailable')
  }

  // ========================================
  // 4. Calculate Final Pricing
  // ========================================
  const costPrice = selectedPlan.price // Vendor's cost (Amigo price)
  const sellingPrice = costPrice + PROFIT_MARGIN // What user pays
  const profit = PROFIT_MARGIN

  // ========================================
  // 5. Validate Wallet Balance
  // ========================================
  if (dbUser.credits < sellingPrice) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Required: ₦${sellingPrice.toLocaleString()}, Available: ₦${dbUser.credits.toLocaleString()}. Please fund your wallet to continue.`
    )
  }

  // ========================================
  // 6. Process Purchase via PurchaseService
  // ========================================
  try {
    const result = await purchaseService.purchase({
      userId: user.id,
      service: 'DATA',
      network: data.network,
      recipient: formattedPhone,
      planId: data.planId,
      idempotencyKey: data.idempotencyKey,
      metadata: {
        source: 'web_app',
        planName: selectedPlan.name,
        costPrice,
        sellingPrice,
        profit,
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    // ========================================
    // 7. Return Success Response
    // ========================================
    return successResponse({
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        service: result.transaction.service,
        network: result.transaction.network,
        recipient: result.transaction.recipient,
        amount: result.transaction.amount,
        sellingPrice: result.transaction.sellingPrice,
        profit: result.transaction.profit,
        status: result.transaction.status,
        createdAt: result.transaction.createdAt,
      },
      plan: {
        name: selectedPlan.name,
        network: data.network,
        validity: selectedPlan.validity,
        costPrice,
        sellingPrice,
        profit,
      },
      wallet: {
        previousBalance: dbUser.credits,
        newBalance: dbUser.credits - sellingPrice,
        amountDeducted: sellingPrice,
      },
      message: result.message,
    }, 'Data purchase successful! You will receive a notification once processed.')

  } catch (error: any) {
    // ========================================
    // 8. Handle Errors with Clear Messages
    // ========================================
    console.error('Data purchase error:', error)

    if (error.message && error.message.includes('Insufficient balance')) {
      throw new InsufficientBalanceError(error.message)
    }

    if (error.message && error.message.includes('Duplicate')) {
      throw new BadRequestError('Duplicate transaction detected. Please check your transaction history.')
    }

    throw new BadRequestError(
      error.message || 'Purchase failed. Please try again or contact support if the issue persists.'
    )
  }
})
