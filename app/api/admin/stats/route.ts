/**
 * Admin Dashboard Stats API
 * GET - Fetch dashboard statistics for admin
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  parseQueryParams,
} from '@/lib/api-utils'

/**
 * GET /api/admin/stats
 * Fetch admin dashboard statistics
 * Query params: period (today, week, month, all)
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()
  
  const params = parseQueryParams(request.url)
  const period = params.getString('period', 'all')

  // Calculate date range based on period
  let startDate: Date | undefined
  const now = new Date()

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0))
      break
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7))
      break
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1))
      break
    default:
      startDate = undefined
  }

  const whereDate = startDate ? { createdAt: { gte: startDate } } : {}

  // Get user statistics
  const [totalUsers, newUsers, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: whereDate }),
    prisma.user.count({
      where: {
        ...whereDate,
        transactions: {
          some: {
            status: 'COMPLETED',
          },
        },
      },
    }),
  ])

  // Get transaction statistics
  const transactions = await prisma.transaction.aggregate({
    where: {
      ...whereDate,
      status: 'COMPLETED',
    },
    _sum: {
      amount: true,
    },
    _count: true,
  })

  // Get revenue by transaction type
  const revenueByType = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      ...whereDate,
      status: 'COMPLETED',
    },
    _sum: {
      amount: true,
    },
    _count: true,
  })

  // Get total wallet balance
  const walletBalance = await prisma.user.aggregate({
    _sum: {
      credits: true,
    },
  })

  // Calculate profit (estimated at 3% average for now)
  const totalRevenue = transactions._sum.amount || 0
  const estimatedProfit = totalRevenue * 0.03

  // Get pending transactions
  const pendingTransactions = await prisma.transaction.count({
    where: {
      status: 'PENDING',
    },
  })

  // Get failed transactions
  const failedTransactions = await prisma.transaction.count({
    where: {
      ...whereDate,
      status: 'FAILED',
    },
  })

  // Calculate growth (compare with previous period)
  let previousRevenue = 0
  if (startDate) {
    const previousPeriodStart = new Date(startDate)
    const periodDiff = now.getTime() - startDate.getTime()
    previousPeriodStart.setTime(previousPeriodStart.getTime() - periodDiff)

    const previousTransactions = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate,
        },
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    })
    previousRevenue = previousTransactions._sum.amount || 0
  }

  const revenueGrowth = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0

  return successResponse({
    period,
    users: {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      growth: 0, // Calculate based on previous period
    },
    transactions: {
      total: transactions._count,
      pending: pendingTransactions,
      failed: failedTransactions,
      completed: transactions._count,
    },
    revenue: {
      total: totalRevenue,
      profit: estimatedProfit,
      profitMargin: totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0,
      growth: revenueGrowth,
      byType: revenueByType.map(item => ({
        type: item.type,
        revenue: item._sum.amount || 0,
        count: item._count,
      })),
    },
    wallet: {
      totalBalance: walletBalance._sum.credits || 0,
    },
  })
})
