/**
 * Wallet API
 * GET - Fetch wallet balance and recent transactions
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  getPaginationParams,
  createPaginatedResponse,
} from '@/lib/api-utils'

/**
 * GET /api/wallet
 * Fetch user wallet balance and transaction summary
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const { limit, skip } = getPaginationParams(new URL(request.url).toString(), 10)

  // Get wallet balance and referral earnings
  const wallet = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      credits: true,
    },
  })

  // Get referral earnings total
  const referralEarnings = await prisma.referralEarning.aggregate({
    where: {
      userId: user.id,
      status: 'PAID',
    },
    _sum: {
      amount: true,
    },
  })

  // Get recent transactions (only WALLET_FUNDING for now, as other types don't exist in enum)
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'WALLET_FUNDING',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        reference: true,
        createdAt: true,
        network: true,
        recipient: true,
        vendorName: true,
      },
    }),
    prisma.transaction.count({
      where: {
        userId: user.id,
        type: 'WALLET_FUNDING',
      },
    }),
  ])

  // Calculate stats
  const stats = await prisma.transaction.aggregate({
    where: {
      userId: user.id,
      status: 'COMPLETED',
    },
    _sum: {
      amount: true,
    },
    _count: true,
  })

  const page = Math.floor(skip / limit) + 1

  return successResponse({
    balance: wallet?.credits || 0,
    referralBalance: referralEarnings._sum.amount || 0,
    totalBalance: (wallet?.credits || 0) + (referralEarnings._sum.amount || 0),
    stats: {
      totalTransactions: stats._count,
      totalSpent: stats._sum.amount || 0,
    },
    transactions: createPaginatedResponse(transactions, total, page, limit),
  })
})
