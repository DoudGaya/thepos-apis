/**
 * Admin User Wallet Credit API
 * POST - Credit a user's wallet (admin action)
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  NotFoundError,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/api-utils'

const creditSchema = z.object({
  amount: z.number().min(100, 'Minimum credit amount is ₦100').max(1000000, 'Maximum credit amount is ₦1,000,000'),
  reason: z.string().min(3, 'Reason is required').max(500, 'Reason is too long'),
})

/**
 * POST /api/admin/users/[id]/credit
 * Credit a user's wallet
 */
export const POST = apiHandler(async (request: Request, context: any) => {
  const admin = await requireAdmin()
  
  const { id: userId } = context.params
  const body = await validateRequestBody(request, creditSchema)
  const { amount, reason } = body as { amount: number; reason: string }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Perform credit in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Credit user wallet
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount,
        },
      },
    })

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: 'WALLET_FUNDING',
        amount,
        status: 'COMPLETED',
        reference: `ADMIN_CREDIT_${Date.now()}`,
        details: {
          method: 'ADMIN_CREDIT',
          reason,
          adminId: admin.id,
          adminEmail: admin.email,
        },
      },
    })

    // Create notification
    await tx.notification.create({
      data: {
        userId,
        type: 'GENERAL',
        title: 'Wallet Credited',
        message: `Your wallet has been credited with ₦${amount.toLocaleString()} by admin. Reason: ${reason}`,
      },
    })

    return { updatedUser, transaction }
  })

  return successResponse({
    message: 'Wallet credited successfully',
    newBalance: result.updatedUser.credits,
    transaction: result.transaction,
  })
})
