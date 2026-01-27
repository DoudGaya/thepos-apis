/**
 * Single Transaction API
 * GET - Fetch single transaction details
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api-utils'

/**
 * GET /api/transactions/[id]
 * Fetch single transaction details
 */
export const GET = apiHandler(async (request: Request, context: any) => {
  const user = await getAuthenticatedUser(request)
  const { id } = context.params

  // Fetch transaction
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      amount: true,
      status: true,
      reference: true,
      details: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      network: true,
      recipient: true,
      vendorName: true,
      vendorReference: true,
      vendorStatus: true,
      costPrice: true,
      sellingPrice: true,
      profit: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  if (!transaction) {
    throw new NotFoundError('Transaction not found')
  }

  // Verify user owns this transaction (or is admin)
  if (transaction.userId !== user.id && user.role !== 'ADMIN') {
    throw new ForbiddenError('Access denied')
  }

  return successResponse({
    transaction,
  })
})
