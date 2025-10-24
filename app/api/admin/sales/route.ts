/**
 * Admin Sales Analytics API
 * GET - Fetch detailed sales and revenue analytics
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  parseQueryParams,
} from '@/lib/api-utils'

/**
 * GET /api/admin/sales
 * Fetch detailed sales analytics for admin
 * Query params: 
 *  - period (today, week, month, year, all)
 *  - groupBy (hour, day, week, month)
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()
  
  const params = parseQueryParams(request.url)
  const period = params.getString('period', 'month')
  const groupBy = params.getString('groupBy', 'day')

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
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1))
      break
    default:
      startDate = undefined
  }

  const whereDate = startDate ? { createdAt: { gte: startDate } } : {}

  // Get revenue by service type with profit margins
  const serviceRevenue = await prisma.transaction.groupBy({
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

  // Define profit margins for each service type (these would come from settings)
  const profitMargins: Record<string, number> = {
    AIRTIME: 0.02, // 2%
    DATA: 0.03, // 3%
    ELECTRICITY: 0.015, // 1.5%
    CABLE_TV: 0.025, // 2.5%
    WALLET_FUNDING: 0.015, // 1.5%
    TRANSFER: 0.01, // 1%
  }

  const revenueByService = serviceRevenue.map(item => {
    const revenue = item._sum.amount || 0
    const margin = profitMargins[item.type] || 0.02
    const profit = revenue * margin
    
    return {
      type: item.type,
      revenue,
      profit,
      profitMargin: margin * 100,
      transactions: item._count,
      averageTransaction: revenue / item._count,
    }
  })

  // Sort by revenue descending
  revenueByService.sort((a, b) => b.revenue - a.revenue)

  // Get all completed transactions for time-based grouping
  const transactions = await prisma.transaction.findMany({
    where: {
      ...whereDate,
      status: 'COMPLETED',
    },
    select: {
      amount: true,
      type: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  // Group transactions by time period
  const timeSeriesData: Record<string, { revenue: number; transactions: number; profit: number }> = {}

  transactions.forEach(transaction => {
    let key: string

    switch (groupBy) {
      case 'hour':
        key = transaction.createdAt.toISOString().slice(0, 13) + ':00'
        break
      case 'day':
        key = transaction.createdAt.toISOString().slice(0, 10)
        break
      case 'week':
        const weekStart = new Date(transaction.createdAt)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        key = weekStart.toISOString().slice(0, 10)
        break
      case 'month':
        key = transaction.createdAt.toISOString().slice(0, 7)
        break
      default:
        key = transaction.createdAt.toISOString().slice(0, 10)
    }

    if (!timeSeriesData[key]) {
      timeSeriesData[key] = { revenue: 0, transactions: 0, profit: 0 }
    }

    const margin = profitMargins[transaction.type] || 0.02
    timeSeriesData[key].revenue += transaction.amount
    timeSeriesData[key].profit += transaction.amount * margin
    timeSeriesData[key].transactions += 1
  })

  // Convert to array and sort by date
  const timeSeries = Object.entries(timeSeriesData)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Calculate peak hours (if grouping by hour or looking at today)
  let peakHours: Array<{ hour: number; revenue: number; transactions: number }> = []
  
  if (groupBy === 'hour' || period === 'today') {
    const hourlyData: Record<number, { revenue: number; transactions: number }> = {}
    
    transactions.forEach(transaction => {
      const hour = transaction.createdAt.getHours()
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = { revenue: 0, transactions: 0 }
      }
      
      hourlyData[hour].revenue += transaction.amount
      hourlyData[hour].transactions += 1
    })

    peakHours = Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5) // Top 5 peak hours
  }

  // Calculate totals
  const totalRevenue = revenueByService.reduce((sum, item) => sum + item.revenue, 0)
  const totalProfit = revenueByService.reduce((sum, item) => sum + item.profit, 0)
  const totalTransactions = revenueByService.reduce((sum, item) => sum + item.transactions, 0)

  return successResponse({
    period,
    groupBy,
    summary: {
      totalRevenue,
      totalProfit,
      overallMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      totalTransactions,
      averageTransaction: totalRevenue / totalTransactions,
    },
    revenueByService,
    timeSeries,
    peakHours,
    topPerformingService: revenueByService[0] || null,
  })
})
