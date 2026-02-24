/**
 * GET /api/referrals/earnings
 * Paginated earnings history for the mobile app.
 * Supports optional ?status=PENDING|PAID|WITHDRAWN filter.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser, getPaginationParams } from '@/lib/api-utils'

export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const { limit, skip, page } = getPaginationParams(request.url, 20)

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get('status') ?? undefined

  const where = {
    userId: user.id,
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const [earnings, total] = await Promise.all([
    prisma.referralEarning.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        referredUser: {
          select: { firstName: true, lastName: true },
        },
        transaction: {
          select: { type: true },
        },
      },
    }),
    prisma.referralEarning.count({ where }),
  ])

  return NextResponse.json({
    earnings: earnings.map((e) => ({
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
      paidAt: e.paidAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  })
})
