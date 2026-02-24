
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser } from '@/lib/api-utils'
import { withCache } from '@/lib/redis'

/**
 * GET /api/referrals/stats
 * Get user's referral statistics and earnings history
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)

  const cacheKey = `referral-stats:${user.id}`

  // Cache stats for 5 minutes (300 seconds)
  const cachedData = await withCache(cacheKey, async () => {
    const userDetails = await prisma.user.findUnique({
        where: { id: user.id },
        select: { referralCode: true }
    })
    const referralCode = userDetails?.referralCode || ''

    const [
        totalReferrals,
        activeReferrals,
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        earningsHistory
    ] = await Promise.all([
        // Total referrals — referredBy stores the referrer's user.id (not the code)
        prisma.user.count({
        where: { referredBy: user.id }
        }),
        // Active referrals (made at least 1 completed transaction)
        prisma.user.count({
        where: {
            referredBy: user.id,
            transactions: { some: { status: 'COMPLETED' } }
        }
        }),
        // Total earnings
        prisma.referralEarning.aggregate({
        where: { userId: user.id },
        _sum: { amount: true }
        }),
        // Pending earnings
        prisma.referralEarning.aggregate({
        where: { userId: user.id, status: 'PENDING' },
        _sum: { amount: true }
        }),
        // Paid earnings
        prisma.referralEarning.aggregate({
        where: { userId: user.id, status: 'PAID' },
        _sum: { amount: true }
        }),
        // Recent earnings history
        prisma.referralEarning.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
            transaction: {
                select: {
                    id: true,
                    amount: true,
                    type: true,
                    status: true
                }
            },
            referredUser: {
                select: {
                    firstName: true,
                    lastName: true
                }
            }
        }
        })
    ])

    return {
        stats: {
        totalReferrals,
        activeReferrals,
        totalEarnings: totalEarnings._sum.amount || 0,
        pendingEarnings: pendingEarnings._sum.amount || 0,
        paidEarnings: paidEarnings._sum.amount || 0,
        },
        history: earningsHistory.map(earning => ({
            id: earning.id,
            amount: earning.amount,
            status: earning.status,
            date: earning.createdAt,
            description: earning.description,
            sourceUser: earning.referredUser ? `${earning.referredUser.firstName} ${earning.referredUser.lastName}` : 'Unknown',
            transactionType: earning.transaction?.type
        }))
    }
  }, 300)

  return NextResponse.json(cachedData)
})
