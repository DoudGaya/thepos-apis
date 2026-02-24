/**
 * GET /api/admin/referrals/earnings
 * Admin-only: paginated view of all ReferralEarning rows across all users.
 * Supports query params: ?status=PENDING|PAID|WITHDRAWN&userId=&page=&limit=
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser, BadRequestError, getPaginationParams } from '@/lib/api-utils'

export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required')

  const { limit, skip, page } = getPaginationParams(request.url, 20)
  const url = new URL(request.url)
  const statusFilter = url.searchParams.get('status') ?? undefined
  const userIdFilter = url.searchParams.get('userId') ?? undefined

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(userIdFilter ? { userId: userIdFilter } : {}),
  }

  const [earnings, total, summary] = await Promise.all([
    prisma.referralEarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        referredUser: {
          select: { firstName: true, lastName: true },
        },
        transaction: {
          select: { type: true, amount: true },
        },
      },
    }),
    prisma.referralEarning.count({ where }),
    // Summary aggregates (always across all users, not filtered)
    prisma.referralEarning.groupBy({
      by: ['status'],
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const summaryMap = Object.fromEntries(
    summary.map((s) => [s.status, { total: s._sum.amount ?? 0, count: s._count }])
  )

  return NextResponse.json({
    earnings: earnings.map((e) => ({
      id: e.id,
      amount: e.amount,
      type: e.type,
      status: e.status,
      description: e.description ?? '',
      user: e.user
        ? {
            id: e.user.id,
            name: `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim(),
            email: e.user.email,
          }
        : null,
      sourceUser: e.referredUser
        ? `${e.referredUser.firstName ?? ''} ${e.referredUser.lastName ?? ''}`.trim()
        : 'Unknown',
      transactionType: e.transaction?.type ?? null,
      createdAt: e.createdAt,
      paidAt: e.paidAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
    summary: {
      paid: summaryMap['PAID'] ?? { total: 0, count: 0 },
      pending: summaryMap['PENDING'] ?? { total: 0, count: 0 },
      withdrawn: summaryMap['WITHDRAWN'] ?? { total: 0, count: 0 },
    },
  })
})
