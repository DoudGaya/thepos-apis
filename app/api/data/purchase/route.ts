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
  // 3. Get Plan Details from Constants (same source as frontend)
  // ========================================
  const { getAllPlansForNetwork, DATA_PLANS } = await import('@/lib/constants/data-plans')

  console.log('📊 Plan Lookup Debug:')
  console.log('  - Network received (string):', data.network)
  console.log('  - Network type:', typeof data.network)
  console.log('  - Network JSON:', JSON.stringify(data.network))
  console.log('  - Available network keys in DATA_PLANS:', Object.keys(DATA_PLANS))

  const plans = getAllPlansForNetwork(data.network as 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE')

  console.log('  - Plans array length:', plans.length)
  console.log('  - PlanId received (string):', data.planId)
  console.log('  - PlanId type:', typeof data.planId)
  console.log('  - PlanId JSON:', JSON.stringify(data.planId))
  console.log('  - Available plan IDs:', plans.map(p => p.id).join(', '))

  const selectedPlan = plans.find(p => p.id === data.planId)

  if (!selectedPlan) {
    console.error('❌ CRITICAL: Plan not found during purchase!')
    console.error('  - Network:', data.network)
    console.error('  - Requested planId:', data.planId)
    console.error('  - Requested planId type:', typeof data.planId)
    console.error('  - Requested planId length:', data.planId.length)
    console.error('  - Available plans count:', plans.length)
    console.error('  - Available plan IDs:', plans.map(p => p.id).join(', '))
    console.error('  - Debug comparison:')
    plans.forEach(p => {
      const matches = p.id === data.planId
      console.error(`    "${p.id}" (${p.id.length}) === "${data.planId}" (${data.planId.length}) ? ${matches}`)
    })

    // Provide helpful error message
    const availablePlansStr = plans.length > 0
      ? plans.map(p => `${p.name} (${p.id}): ₦${p.sellingPrice}`).join(', ')
      : 'No plans available'

    throw new BadRequestError(
      `Selected plan not found. Requested: "${data.planId}". Available plans for ${data.network}: ${availablePlansStr}`
    )
  }

  if (!selectedPlan.isAvailable) {
    throw new BadRequestError('Selected plan is currently unavailable. Please try another plan.')
  }

  // ========================================
  // 4. Calculate Final Pricing
  // ========================================
  const costPrice = selectedPlan.costPrice // Base cost from plans
  const sellingPrice = selectedPlan.sellingPrice // Already includes ₦100 margin
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
