/**
 * Cable TV Purchase API
 * POST - Subscribe to cable TV (DStv, GOtv, Startimes) via VTPass
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

const cableTVPurchaseSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),       // 'dstv' | 'gotv' | 'startimes'
  smartcardNumber: z.string().min(10, 'Invalid smartcard number'),
  packageId: z.string().min(1, 'Package is required'),       // variation_code e.g. 'dstv-padi'
  subscriptionType: z.enum(['renew', 'change']).default('renew'),
  customerPhone: z.string().optional(),
  pin: z.string().min(4, 'Transaction PIN is required').max(6, 'PIN must be 4-6 digits'),
})

export const POST = apiHandler(async (req: Request) => {
  const user = await getAuthenticatedUser(req)
  const body = await validateRequestBody(req, cableTVPurchaseSchema)
  const { provider, smartcardNumber, packageId, subscriptionType, customerPhone, pin } =
    body as z.infer<typeof cableTVPurchaseSchema>

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

  // Normalise provider to uppercase for VTPass (DSTV, GOTV, STARTIMES)
  const vtpassProvider = provider.toUpperCase() as 'DSTV' | 'GOTV' | 'STARTIMES' | 'SHOWMAX'

  // Look up plan price from VTPass so the user can't manipulate it
  let planPrice = 0
  try {
    const plans = await vendorService.getPlans('CABLE_TV', vtpassProvider as any, 'VTPASS')
    const plan = plans.find(p => p.id === packageId)
    if (plan) {
      planPrice = plan.price
    }
  } catch (e) {
    console.warn('[cable-tv] Could not fetch plan price from VTPass, proceeding without:', e)
  }

  if (!planPrice) {
    throw new BadRequestError('Could not determine plan price. Please try again.')
  }

  try {
    const result = await purchaseService.purchase({
      userId: user.id,
      service: 'CABLE_TV',
      network: vtpassProvider as any,
      recipient: smartcardNumber,
      planId: packageId,
      amount: planPrice,
      metadata: {
        provider: vtpassProvider,
        subscriptionType,
        customerPhone,
      },
    })

    return successResponse({
      transactionId: result.transaction.id,
      reference: result.transaction.reference,
      status: result.transaction.status,
      message: result.message,
    }, 'Cable TV subscription initiated')

  } catch (error: any) {
    if (error.message?.includes('Insufficient balance')) {
      throw new InsufficientBalanceError(error.message)
    }
    throw error
  }
})
