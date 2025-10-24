/**
 * Referrals API
 * GET - Fetch referral stats and referred users
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
 * GET /api/referrals
 * Fetch user's referral information
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const { limit, skip, page } = getPaginationParams(request.url, 20)

  // Get user's referral code
  const userInfo = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      referralCode: true,
      referredBy: true,
    },
  })

  // Get referred users with pagination
  const [referrals, totalReferrals] = await Promise.all([
    prisma.referral.findMany({
      where: {
        referrerId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        referredId: true,
        status: true,
        createdAt: true,
        referred: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.referral.count({
      where: {
        referrerId: user.id,
      },
    }),
  ])

  // Get referral earnings
  const earnings = await prisma.referralEarning.aggregate({
    where: {
      userId: user.id,
    },
    _sum: {
      amount: true,
    },
    _count: true,
  })

  // Get total earnings withdrawn
  const withdrawn = await prisma.referralEarning.aggregate({
    where: {
      userId: user.id,
      status: 'WITHDRAWN',
    },
    _sum: {
      amount: true,
    },
  })

  // Get pending earnings
  const pending = await prisma.referralEarning.aggregate({
    where: {
      userId: user.id,
      status: 'PENDING',
    },
    _sum: {
      amount: true,
    },
  })

  // Calculate available balance (total - withdrawn)
  const totalEarned = earnings._sum.amount || 0
  const totalWithdrawn = withdrawn._sum.amount || 0
  const pendingAmount = pending._sum.amount || 0
  const availableBalance = totalEarned - totalWithdrawn

  return successResponse({
    referralCode: userInfo?.referralCode,
    referredBy: userInfo?.referredBy,
    stats: {
      totalReferrals,
      activeReferrals: referrals.filter(r => r.status === 'ACTIVE').length,
      totalEarned,
      availableBalance,
      pendingAmount,
      totalWithdrawn,
      earningsCount: earnings._count,
    },
    referrals: createPaginatedResponse(referrals, totalReferrals, page, limit),
  })
})
