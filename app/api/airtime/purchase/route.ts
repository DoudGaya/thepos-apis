/**
 * Airtime Purchase API
 * POST - Purchase airtime for any Nigerian network
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

// Airtime purchase validation schema
const airtimePurchaseSchema = z.object({
  network: z.enum(['MTN', 'GLO', 'AIRTEL', '9MOBILE'], {
    errorMap: () => ({ message: 'Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE' }),
  }),
  phone: z.string().min(11, 'Phone number is required'),
  amount: z.number().min(50, 'Minimum airtime amount is ₦50').max(50000, 'Maximum airtime amount is ₦50,000'),
  pin: z.string().min(4, 'Transaction PIN is required').max(6, 'PIN must be 4-6 digits'),
  idempotencyKey: z.string().optional(),
})

/**
 * POST /api/airtime/purchase
 * Purchase airtime
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const data = (await validateRequestBody(request, airtimePurchaseSchema)) as z.infer<typeof airtimePurchaseSchema>

  // Validate and format phone number
  if (!validateNigerianPhone(data.phone)) {
    throw new BadRequestError('Invalid Nigerian phone number')
  }

  const formattedPhone = formatNigerianPhone(data.phone)

  // Verify Transaction PIN
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pinHash: true },
  })

  if (!dbUser?.pinHash) {
    throw new BadRequestError('Transaction PIN not set. Please set a PIN in your profile.')
  }

  const isPinValid = await comparePassword(data.pin, dbUser.pinHash)
  if (!isPinValid) {
    throw new BadRequestError('Invalid transaction PIN')
  }

  try {
    const result = await purchaseService.purchase({
      userId: user.id,
      service: 'AIRTIME',
      network: data.network,
      recipient: formattedPhone,
      amount: data.amount,
      idempotencyKey: data.idempotencyKey,
      metadata: {
        source: 'web_app',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return successResponse({
      transaction: result.transaction,
      message: result.message,
    }, 'Airtime purchase successful')

  } catch (error: any) {
    console.error('Airtime purchase error:', error)

    if (error.message && error.message.includes('Insufficient balance')) {
      throw new InsufficientBalanceError(error.message)
    }

    throw new BadRequestError(
      error.message || 'Airtime purchase failed. Please try again.'
    )
  }
})
