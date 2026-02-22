/**
 * Electricity Purchase API
 * POST - Purchase electricity tokens for prepaid/postpaid meters
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
} from '@/lib/api-utils'

// Normalize any electricity provider string to the VTPass key (e.g. 'ikeja_electric' → 'IKEJA')
function normalizeElectricityProvider(raw: string): string {
  const s = raw.toUpperCase().replace(/[\s_-]+/g, '')
  if (s.includes('IKEJA') || s.includes('IKEDC')) return 'IKEJA'
  if (s.includes('EKO') || s.includes('EKEDC')) return 'EKO'
  if (s.includes('ABUJA') || s.includes('AEDC')) return 'ABUJA'
  if (s.includes('KANO') || s.includes('KEDCO') || s.includes('KAEDCO')) return 'KANO'
  if (s.includes('PORTHARCOURT') || s.includes('HARCOURT') || s.includes('PHED')) return 'PORTHARCOURT'
  if (s.includes('JOS') || s.includes('JED')) return 'JOS'
  if (s.includes('IBADAN') || s.includes('IBEDC')) return 'IBADAN'
  if (s.includes('KADUNA')) return 'KADUNA'
  if (s.includes('ENUGU') || s.includes('EEDC')) return 'ENUGU'
  if (s.includes('BENIN') || s.includes('BEDC')) return 'BENIN'
  if (s.includes('ABA')) return 'ABA'
  if (s.includes('YOLA') || s.includes('YEDC')) return 'YOLA'
  return s
}

const electricityPurchaseSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  meterNumber: z.string().min(10, 'Invalid meter number'),
  meterType: z.enum(['prepaid', 'postpaid', 'PREPAID', 'POSTPAID']).default('prepaid'),
  amount: z.number().min(1000, 'Minimum amount is ₦1,000').max(100000, 'Maximum amount is ₦100,000'),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  pin: z.string().min(4, 'Transaction PIN is required').max(6, 'PIN must be 4-6 digits'),
});

export const POST = apiHandler(async (req: Request) => {
  const user = await getAuthenticatedUser(req)
  const body = await validateRequestBody(req, electricityPurchaseSchema)
  const { provider, meterNumber, meterType, amount, customerPhone, customerName, pin } =
    body as z.infer<typeof electricityPurchaseSchema>

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

  const vtpassProvider = normalizeElectricityProvider(provider)

  try {
    const result = await purchaseService.purchase({
      userId: user.id,
      service: 'ELECTRICITY',
      network: vtpassProvider as any,
      recipient: meterNumber,
      amount,
      metadata: {
        meterType: meterType.toUpperCase(),
        customerName,
        customerPhone,
        provider: vtpassProvider,
      },
    })

    return successResponse({
      transactionId: result.transaction.id,
      reference: result.transaction.reference,
      status: result.transaction.status,
      message: result.message,
    }, 'Electricity purchase initiated')

  } catch (error: any) {
    if (error.message?.includes('Insufficient balance')) {
      throw new BadRequestError(error.message)
    }
    throw error
  }
})

