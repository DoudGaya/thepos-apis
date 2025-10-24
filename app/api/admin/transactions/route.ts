/**
 * Admin Transaction Management API
 * GET - List all transactions with filters
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  getPaginationParams,
  createPaginatedResponse,
  parseQueryParams,
} from '@/lib/api-utils'

/**
 * GET /api/admin/transactions
 * List all transactions with advanced filtering and search
 * Query params:
 *  - search (reference, user email/phone)
 *  - type (TransactionType)
 *  - status (TransactionStatus)
 *  - startDate, endDate
 *  - page, limit
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()
  
  const params = parseQueryParams(request.url)
  const search = params.getString('search')
  const type = params.getString('type')
  const status = params.getString('status')
  const startDateStr = params.getString('startDate')
  const endDateStr = params.getString('endDate')
  const { limit, skip, page } = getPaginationParams(request.url, 50)

  // Parse dates
  const startDate = startDateStr ? new Date(startDateStr) : undefined
  const endDate = endDateStr ? new Date(endDateStr) : undefined

  // Build where clause
  const where: any = {}

  // Filter by transaction type
  if (type) {
    where.type = type
  }

  // Filter by status
  if (status) {
    where.status = status
  }

  // Filter by date range
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  // Search functionality - in reference or user details
  if (search) {
    where.OR = [
      { reference: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search, mode: 'insensitive' } } },
      { user: { firstName: { contains: search, mode: 'insensitive' } } },
      { user: { lastName: { contains: search, mode: 'insensitive' } } },
    ]
  }

  // Fetch transactions with pagination
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    }),
    prisma.transaction.count({ where }),
  ])

  // Calculate summary statistics
  const summaryStats = await prisma.transaction.aggregate({
    where: {
      ...where,
      status: 'COMPLETED',
    },
    _sum: {
      amount: true,
    },
    _count: true,
  })

  // Get status breakdown
  const statusBreakdown = await prisma.transaction.groupBy({
    by: ['status'],
    where,
    _count: true,
    _sum: {
      amount: true,
    },
  })

  // Get type breakdown
  const typeBreakdown = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      ...where,
      status: 'COMPLETED',
    },
    _count: true,
    _sum: {
      amount: true,
    },
  })

  return successResponse({
    transactions: createPaginatedResponse(transactions, total, page, limit),
    summary: {
      totalTransactions: summaryStats._count,
      totalAmount: summaryStats._sum.amount || 0,
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: item._count,
        amount: item._sum.amount || 0,
      })),
      typeBreakdown: typeBreakdown.map(item => ({
        type: item.type,
        count: item._count,
        amount: item._sum.amount || 0,
      })),
    },
  })
})
