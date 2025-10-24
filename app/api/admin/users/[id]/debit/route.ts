/**
 * Admin User Wallet Debit API
 * POST - Debit a user's wallet (admin action)
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  NotFoundError,
  validateRequestBody,
  InsufficientBalanceError,
} from '@/lib/api-utils'
import { z } from 'zod'

const debitSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0').max(1000000, 'Maximum debit amount is ₦1,000,000'),
  reason: z.string().min(3, 'Reason is required').max(500, 'Reason is too long'),
})

/**
 * POST /api/admin/users/[id]/debit
 * Debit a user's wallet
 */
export const POST = apiHandler(async (request: Request, context: any) => {
  const admin = await requireAdmin()
  
  const { id: userId } = context.params
  const body = await validateRequestBody(request, debitSchema)
  const { amount, reason } = body as { amount: number; reason: string }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Check if user has sufficient balance
  if (user.credits < amount) {
    throw new InsufficientBalanceError(
      `Insufficient balance. User has ₦${user.credits.toLocaleString()}, trying to debit ₦${amount.toLocaleString()}`
    )
  }

  // Perform debit in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Debit user wallet
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: amount,
        },
      },
    })

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: 'WALLET_FUNDING', // Using WALLET_FUNDING with negative context via details
        amount,
        status: 'COMPLETED',
        reference: `ADMIN_DEBIT_${Date.now()}`,
        details: {
          method: 'ADMIN_DEBIT',
          reason,
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'debit',
        },
      },
    })

    // Create notification
    await tx.notification.create({
      data: {
        userId,
        type: 'GENERAL',
        title: 'Wallet Debited',
        message: `Your wallet has been debited ₦${amount.toLocaleString()} by admin. Reason: ${reason}`,
      },
    })

    return { updatedUser, transaction }
  })

  return successResponse({
    message: 'Wallet debited successfully',
    newBalance: result.updatedUser.credits,
    transaction: result.transaction,
  })
})
