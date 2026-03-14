/**
 * Education Purchase API
 * POST - Purchase exam PINs/scratch cards (WAEC, JAMB, NECO)
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth'
import { purchaseService } from '@/lib/services/purchase.service'
import { vendorService } from '@/lib/vendors'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

const EXAM_NETWORK_MAP: Record<string, string> = {
  WAEC_RESULT: 'WAEC',
  WAEC_REG:    'WAEC_REG',
  JAMB:        'JAMB',
  NECO:        'NECO',
}

const educationPurchaseSchema = z.object({
  examType:    z.enum(['WAEC_RESULT', 'WAEC_REG', 'JAMB', 'NECO']),
  planId:      z.string().min(1, 'Plan is required'),
  phone:       z.string().optional(),
  profileCode: z.string().optional(),   // JAMB profile code
  pin:         z.string().min(4, 'Transaction PIN is required').max(6, 'PIN must be 4-6 digits'),
})

export const POST = apiHandler(async (req: Request) => {
  const user = await getAuthenticatedUser(req)
  const body = await validateRequestBody(req, educationPurchaseSchema)
  const { examType, planId, phone, profileCode, pin } =
    body as z.infer<typeof educationPurchaseSchema>

  // Verify Transaction PIN
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pinHash: true },
  })

  if (!dbUser?.pinHash) {
    throw new BadRequestError('Transaction PIN not set. Please set a PIN in your profile.')
  }

  const isPinValid = await comparePassword(pin, dbUser.pinHash)
  if (!isPinValid) {
    throw new BadRequestError('Invalid transaction PIN')
  }

  const network = EXAM_NETWORK_MAP[examType] as any

  // Look up plan price — try VTPass first, fall back to Monnify
  let planPrice = 0
  let targetVendor = 'VTPASS'
  try {
    const vtpassPlans = await vendorService.getPlans('EDUCATION', network, 'VTPASS')
    const plan = vtpassPlans.find(p => p.id === planId)
    if (plan) { planPrice = plan.price; targetVendor = 'VTPASS' }
  } catch (e) {
    console.warn('[education] VTPass plan lookup failed:', e)
  }

  if (!planPrice) {
    try {
      const monnifyPlans = await vendorService.getPlans('EDUCATION', network, 'MONNIFY')
      const plan = monnifyPlans.find(p => p.id === planId)
      if (plan) { planPrice = plan.price; targetVendor = 'MONNIFY' }
    } catch (e) {
      console.warn('[education] Monnify plan lookup failed:', e)
    }
  }

  if (!planPrice) {
    throw new BadRequestError('Could not determine plan price. Please try again.')
  }

  try {
    const result = await purchaseService.purchase({
      userId:    user.id,
      service:   'EDUCATION',
      network,
      recipient: examType === 'JAMB' ? (profileCode || phone || '') : (phone || ''),
      planId,
      amount:    planPrice,
      targetVendor,
      metadata: {
        examName:    examType,
        phone,
        profileCode: examType === 'JAMB' ? profileCode : undefined,
      },
    })

    return successResponse({
      transactionId: result.transaction.id,
      reference:     result.transaction.reference,
      status:        result.transaction.status,
      message:       result.message,
    }, 'Education purchase initiated')

  } catch (error: any) {
    if (error.message?.includes('Insufficient balance')) {
      throw new InsufficientBalanceError(error.message)
    }
    throw error
  }
})
