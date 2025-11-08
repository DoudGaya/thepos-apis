/**
 * Admin Dashboard API
 * GET - Fetch comprehensive dashboard data for admin overview
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  parseQueryParams,
} from '@/lib/api-utils'

/**
 * GET /api/admin/dashboard
 * Fetch comprehensive dashboard data including stats, recent activity, and system health
 * Query params: period (today, week, month, all)
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()

  const params = parseQueryParams(request.url)
  const period = params.getString('period', 'month')

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

  // Get basic stats (similar to /api/admin/stats)
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

  // Get pending and failed transactions
  const [pendingTransactions, failedTransactions] = await Promise.all([
    prisma.transaction.count({
      where: {
        status: 'PENDING',
      },
    }),
    prisma.transaction.count({
      where: {
        ...whereDate,
        status: 'FAILED',
      },
    }),
  ])

  // Get recent transactions (last 10)
  const recentTransactions = await prisma.transaction.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  // Get recent users (last 5)
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      role: true,
    },
  })

  // Get system health metrics
  const systemHealth = {
    database: 'healthy', // Could be enhanced with actual DB checks
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  }

  // Get vendor status summary
  const vendorStatus = await prisma.vendorConfig.groupBy({
    by: ['isHealthy'],
    _count: true,
  })

  // Calculate growth metrics
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
    overview: {
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
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
      },
      wallet: {
        totalBalance: walletBalance._sum.credits || 0,
      },
    },
    revenueByType: revenueByType.map(item => ({
      type: item.type,
      revenue: item._sum.amount || 0,
      count: item._count,
    })),
    recentActivity: {
      transactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.createdAt,
        user: tx.user,
      })),
      users: recentUsers,
    },
    systemHealth,
    vendorStatus: vendorStatus.reduce((acc, item) => {
      acc[item.isHealthy ? 'healthy' : 'unhealthy'] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})