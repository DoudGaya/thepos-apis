/**
 * Admin Transaction Refund API
 * POST - Process a refund for a transaction
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

const refundSchema = z.object({
  reason: z.string().min(10, 'Refund reason must be at least 10 characters').max(500, 'Reason is too long'),
})

/**
 * POST /api/admin/transactions/[id]/refund
 * Process a refund for a failed or disputed transaction
 */
export const POST = apiHandler(async (request: Request, context: any) => {
  const admin = await requireAdmin()
  
  const { id: transactionId } = context.params
  const body = await validateRequestBody(request, refundSchema)
  const { reason } = body as { reason: string }

  // Find the transaction
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          credits: true,
        },
      },
    },
  })

  if (!transaction) {
    throw new NotFoundError('Transaction not found')
  }

  // Check if transaction can be refunded
  if (transaction.status === 'COMPLETED') {
    throw new BadRequestError('Cannot refund a completed transaction. Please use debit/credit functions.')
  }

  if (transaction.status === 'CANCELLED') {
    throw new BadRequestError('Transaction is already cancelled')
  }

  // Process refund in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Credit user's wallet
    const updatedUser = await tx.user.update({
      where: { id: transaction.userId },
      data: {
        credits: {
          increment: transaction.amount,
        },
      },
    })

    // Update transaction status
    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'CANCELLED',
        details: {
          ...(typeof transaction.details === 'object' ? transaction.details : {}),
          refundReason: reason,
          refundedBy: admin.id,
          refundedByEmail: admin.email,
          refundedAt: new Date().toISOString(),
        },
      },
    })

    // Create a refund transaction record
    const refundTransaction = await tx.transaction.create({
      data: {
        userId: transaction.userId,
        type: 'WALLET_FUNDING',
        amount: transaction.amount,
        status: 'COMPLETED',
        reference: `REFUND_${transaction.reference}`,
        details: {
          method: 'ADMIN_REFUND',
          originalTransactionId: transactionId,
          originalReference: transaction.reference,
          reason,
          adminId: admin.id,
          adminEmail: admin.email,
        },
      },
    })

    // Create notification
    await tx.notification.create({
      data: {
        userId: transaction.userId,
        type: 'TRANSACTION',
        title: 'Refund Processed',
        message: `Your transaction ${transaction.reference} has been refunded. ₦${transaction.amount.toLocaleString()} has been credited to your wallet. Reason: ${reason}`,
      },
    })

    return { updatedUser, updatedTransaction, refundTransaction }
  })

  return successResponse({
    message: 'Refund processed successfully',
    refundAmount: transaction.amount,
    newUserBalance: result.updatedUser.credits,
    transaction: result.updatedTransaction,
    refundTransaction: result.refundTransaction,
  })
})
