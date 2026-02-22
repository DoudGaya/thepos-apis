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
  const user = await getAuthenticatedUser(request)
  const data = (await validateRequestBody(request, dataPurchaseSchema)) as z.infer<typeof dataPurchaseSchema>

  // Check if DATA service is enabled for this network in Pricing table
  const pricing = await prisma.pricing.findFirst({
    where: {
      service: 'DATA',
      network: data.network,
    },
  })

  // If service is globally disabled
  if (pricing && !pricing.isActive) {
    throw new BadRequestError(`Data purchases are currently disabled for ${data.network}. Please try again later.`)
  }

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

  console.log('🔒 PIN Verification:')
  console.log('  - PIN received:', data.pin)
  console.log('  - PIN received (hex):', Buffer.from(data.pin).toString('hex'))
  console.log('  - PIN Length:', data.pin.length)
  console.log('  - PIN Type:', typeof data.pin)
  console.log('  - PinHash exists:', !!dbUser.pinHash)
  console.log('  - PinHash starts with:', dbUser.pinHash?.substring(0, 7))

  // Directly check if bcrypt hash is valid
  let isPinValid = false
  try {
    isPinValid = await comparePassword(data.pin, dbUser.pinHash)
  } catch (bcryptErr: any) {
    console.log('❌ Bcrypt comparison error:', bcryptErr.message)
    isPinValid = false
  }

  console.log('  - PIN Valid:', isPinValid)

  if (!isPinValid) {
    console.log('❌ PIN verification failed')
    console.log('   User Email:', dbUser.email)
    console.log('   Checking PIN in database...')
    // Get fresh user data to verify
    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { pinHash: true },
    })
    console.log('   Fresh pinHash exists:', !!freshUser?.pinHash)
    console.log('   Fresh pinHash starts with:', freshUser?.pinHash?.substring(0, 7))
    throw new BadRequestError('Incorrect PIN. Please try again.')
  }

  // ========================================
  // 3. Get Plan Details from Database
  // ========================================
  console.log('📊 Plan Lookup Debug:')
  console.log('  - Network:', data.network)
  console.log('  - Plan UUID:', data.planId)

  // Find plan in database using UUID
  const selectedPlan = await prisma.dataPlan.findUnique({
    where: { id: data.planId },
    include: { vendor: true }
  })

  if (!selectedPlan) {
    throw new BadRequestError(`Selected plan not found. Please refresh the plans list and try again.`)
  }

  // Validate Network match
  if (selectedPlan.network !== data.network) {
     throw new BadRequestError(`Plan network mismatch. Expected ${data.network} but plan is for ${selectedPlan.network}`)
  }

  if (!selectedPlan.isActive) {
    throw new BadRequestError('Selected plan is currently unavailable. Please try another plan.')
  }

  // ========================================
  // 4. Calculate Final Pricing
  // ========================================
  const costPrice = selectedPlan.costPrice 
  const sellingPrice = selectedPlan.sellingPrice
  const profit = sellingPrice - costPrice

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
  let result;
  let finalPlan = selectedPlan; // Keep track of which plan actually succeeded
  
  try {
    try {
      result = await purchaseService.purchase({
        userId: user.id,
        service: 'DATA',
        network: data.network,
        recipient: formattedPhone,
        planId: selectedPlan.planId, // Use Vendor's Plan ID (e.g. "5000") NOT our UUID
        dataPlanPrice: selectedPlan.sellingPrice, // Use Database Price as source of truth
        costPrice: selectedPlan.costPrice, // Pass cost price from DB for vendors that don't support dynamic lookup
        targetVendor: selectedPlan.vendor.adapterId, // Force usage of plan's vendor
        idempotencyKey: data.idempotencyKey,
        metadata: {
          source: 'web_app',
          planName: selectedPlan.size,
          costPrice,
          sellingPrice,
          profit,
          userAgent: request.headers.get('user-agent') || 'unknown',
          isFailover: false,
          fallbackPlanDbId: selectedPlan.id, // lets processPurchaseAsync retry with another vendor on balance error
        },
      })
    } catch (primaryError: any) {
      // Check for errors that should NOT trigger a retry
      // e.g. insufficient user balance, duplicate transaction, or validation errors
      const isUserError = 
        primaryError.name === 'InsufficientBalanceError' ||
        primaryError.message.includes('Insufficient balance') ||
        primaryError.message.includes('Duplicate') ||
        primaryError.message.includes('PIN') ||
        primaryError.message.includes('Invalid');

      if (isUserError) {
        throw primaryError; // Re-throw immediately
      }

      console.warn(`Primary purchase failed for plan ${selectedPlan.id} via ${selectedPlan.vendor.adapterId}. Attempting failover...`, primaryError.message);

      // Attempt Failover: Find an alternative plan with same specs
      const fallbackPlan = await prisma.dataPlan.findFirst({
        where: {
          network: selectedPlan.network,
          size: selectedPlan.size,
          planType: selectedPlan.planType,
          validity: selectedPlan.validity,
          id: { not: selectedPlan.id }, // Must be different plan ID
          isActive: true,
          vendor: { isEnabled: true }
        },
        orderBy: [
           { vendor: { isPrimary: 'desc' } }, // Try another primary if exists? Or usually there's only one primary. 
           { costPrice: 'asc' } // Prioritize cheapest fallback
        ],
        include: { vendor: true }
      });

      if (!fallbackPlan) {
        console.warn('No suitable fallback plan found. Throwing original error.');
        throw primaryError;
      }

      console.log(`Fallback plan found: ${fallbackPlan.id} via ${fallbackPlan.vendor.adapterId}`);

      // Retry Purchase with Fallback Plan
      // calculate new margin - we keep the User's Selling Price fixed!
      const fallbackProfit = sellingPrice - fallbackPlan.costPrice;

      result = await purchaseService.purchase({
        userId: user.id,
        service: 'DATA',
        network: data.network,
        recipient: formattedPhone,
        planId: fallbackPlan.planId, 
        dataPlanPrice: sellingPrice, // Keep original selling price
        costPrice: fallbackPlan.costPrice,
        targetVendor: fallbackPlan.vendor.adapterId,
        idempotencyKey: data.idempotencyKey ? `${data.idempotencyKey}_retry` : undefined, // Ensure unique key for retry
        metadata: {
          source: 'web_app',
          planName: fallbackPlan.size,
          costPrice: fallbackPlan.costPrice,
          sellingPrice,
          profit: fallbackProfit,
          userAgent: request.headers.get('user-agent') || 'unknown',
          isFailover: true,
          originalPlanId: selectedPlan.id,
          failoverReason: primaryError.message,
          fallbackPlanDbId: fallbackPlan.id, // lets processPurchaseAsync retry with another vendor on balance error
        },
      });

      // If successful, update finalPlan reference for response
      finalPlan = fallbackPlan;
    }

    // ========================================
    // 7. Return Success Response
    // ========================================
    // Recalculate profit based on final plan used
    const finalProfit = sellingPrice - finalPlan.costPrice;

    return successResponse({
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        service: result.transaction.service,
        network: result.transaction.network,
        recipient: result.transaction.recipient,
        amount: result.transaction.amount,
        sellingPrice: result.transaction.sellingPrice,
        profit: finalProfit, // Use actual profit from transaction
        status: result.transaction.status,
        createdAt: result.transaction.createdAt,
      },
      plan: {
        name: finalPlan.size,
        network: data.network,
        validity: finalPlan.validity,
        costPrice: finalPlan.costPrice,
        sellingPrice,
        profit: finalProfit,
        vendor: finalPlan.vendor.vendorName // informative
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
