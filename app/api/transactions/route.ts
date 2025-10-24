/**
 * Transactions API
 * GET - Fetch user transactions with filtering and pagination
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  getPaginationParams,
  parseQueryParams,
  createPaginatedResponse,
} from '@/lib/api-utils'

/**
 * GET /api/transactions
 * Fetch user transactions with filters
 * Query params: page, limit, type, status, startDate, endDate, search
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const { limit, skip, page } = getPaginationParams(request.url, 20)
  const params = parseQueryParams(request.url)

  // Build filter conditions
  const where: any = {
    userId: user.id,
  }

  // Filter by transaction type
  const type = params.getString('type')
  if (type) {
    where.type = type
  }

  // Filter by status
  const status = params.getString('status')
  if (status) {
    where.status = status
  }

  // Filter by date range
  const startDate = params.getString('startDate')
  const endDate = params.getString('endDate')
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(startDate)
    }
    if (endDate) {
      // Set to end of day
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  // Search by reference
  const search = params.getString('search')
  if (search) {
    where.reference = {
      contains: search,
      mode: 'insensitive',
    }
  }

  // Fetch transactions with pagination
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        reference: true,
        details: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ])

  // Calculate summary stats for filtered transactions
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

  return successResponse({
    transactions: createPaginatedResponse(transactions, total, page, limit),
    stats: {
      totalTransactions: stats._count,
      totalSpent: stats._sum.amount || 0,
    },
  })
})
