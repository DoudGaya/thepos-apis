/**
 * GET /api/referrals/summary
 * Unified mobile endpoint — returns everything the referral screen needs
 * in a single request: stats, recent referrals list, recent earnings history.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser } from '@/lib/api-utils'

export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)

  const [
    userInfo,
    totalReferrals,
    activeReferrals,
    earningsAgg,
    withdrawnAgg,
    pendingAgg,
    recentReferrals,
    recentEarnings,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { referralCode: true },
    }),

    // referredBy holds the referrer's user.id
    prisma.user.count({ where: { referredBy: user.id } }),

    prisma.user.count({
      where: {
        referredBy: user.id,
        transactions: { some: { status: 'COMPLETED' } },
      },
    }),

    // Total ever earned
    prisma.referralEarning.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),

    // Total withdrawn to wallet
    prisma.referralEarning.aggregate({
      where: { userId: user.id, status: 'WITHDRAWN' },
      _sum: { amount: true },
    }),

    // Pending (not yet paid or withdrawn)
    prisma.referralEarning.aggregate({
      where: { userId: user.id, status: 'PENDING' },
      _sum: { amount: true },
    }),

    // Recent referred users
    prisma.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        createdAt: true,
        referred: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            hasFundedWallet: true,
            createdAt: true,
          },
        },
      },
    }),

    // Recent earnings
    prisma.referralEarning.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        referredUser: {
          select: { firstName: true, lastName: true },
        },
        transaction: {
          select: { type: true },
        },
      },
    }),
  ])

  const referralCode = userInfo?.referralCode ?? ''
  const totalEarned = earningsAgg._sum.amount ?? 0
  const totalWithdrawn = withdrawnAgg._sum.amount ?? 0
  const availableBalance = totalEarned - totalWithdrawn
  const pendingEarnings = pendingAgg._sum.amount ?? 0

  return NextResponse.json({
    referralCode,
    referralLink: `https://pay.nillar.com/ref/${referralCode}`,
    stats: {
      totalReferrals,
      activeReferrals,
      totalEarned,
      availableBalance,
      pendingEarnings,
      totalWithdrawn,
    },
    recentReferrals: recentReferrals.map((r) => ({
      id: r.id,
      name: `${r.referred.firstName ?? 'User'} ${r.referred.lastName ?? ''}`.trim(),
      joinedAt: r.referred.createdAt,
      status: r.referred.hasFundedWallet ? 'Active' : 'Pending',
    })),
    recentEarnings: recentEarnings.map((e) => ({
      id: e.id,
      amount: e.amount,
      type: e.type,
      status: e.status,
      description: e.description ?? '',
      sourceUser: e.referredUser
        ? `${e.referredUser.firstName ?? ''} ${e.referredUser.lastName ?? ''}`.trim()
        : 'Unknown',
      transactionType: e.transaction?.type ?? null,
      createdAt: e.createdAt,
    })),
  })
})
