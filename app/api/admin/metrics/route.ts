/**
 * Admin Dashboard Metrics API
 * GET - Fetch admin dashboard metrics and analytics
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser, BadRequestError } from '@/lib/api-utils'

/**
 * GET /api/admin/metrics
 * Fetch dashboard analytics
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()

  // Verify admin access (optional - remove if you want to allow all users)
  // if (user.role !== 'ADMIN') {
  //   throw new BadRequestError('Admin access required')
  // }

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Total users
    const totalUsers = await prisma.user.count()

    // New users this month
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    // Transaction metrics
    const totalTransactions = await prisma.transaction.count()
    const transactionsThisMonth = await prisma.transaction.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    // Revenue calculations
    const revenueData = await prisma.transaction.aggregate({
      where: {
        status: { in: ['SUCCESS', 'COMPLETED'] },
        type: { in: ['DATA', 'AIRTIME', 'ELECTRICITY', 'CABLE'] },
      },
      _sum: {
        amount: true,
      },
    })

    const monthlyRevenueData = await prisma.transaction.aggregate({
      where: {
        status: { in: ['SUCCESS', 'COMPLETED'] },
        type: { in: ['DATA', 'AIRTIME', 'ELECTRICITY', 'CABLE'] },
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Wallet funding volume
    const walletFundingData = await prisma.transaction.aggregate({
      where: {
        type: 'WALLET_FUNDING',
        status: { in: ['SUCCESS', 'COMPLETED'] },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    const monthlyWalletFundingData = await prisma.transaction.aggregate({
      where: {
        type: 'WALLET_FUNDING',
        status: { in: ['SUCCESS', 'COMPLETED'] },
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Referral metrics
    const totalReferrals = await prisma.referral.count({
      where: {
        status: 'COMPLETED',
      },
    })

    const referralEarningsData = await prisma.referralEarning.aggregate({
      where: {
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    })

    // Transaction status breakdown
    const transactionStatus = await prisma.transaction.groupBy({
      by: ['status'],
      _count: true,
    })

    // Transaction type breakdown
    const transactionTypes = await prisma.transaction.groupBy({
      by: ['type'],
      _count: true,
      _sum: {
        amount: true,
      },
    })

    // Top networks
    const topNetworks = await prisma.transaction.findMany({
      where: {
        type: 'DATA',
        status: { in: ['SUCCESS', 'COMPLETED'] },
      },
      select: {
        details: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const networkCounts: Record<string, number> = {}
    topNetworks.forEach(tx => {
      const details = tx.details as Record<string, any>
      if (details?.network) {
        networkCounts[details.network] = (networkCounts[details.network] || 0) + 1
      }
    })

    // Recent failed transactions
    const failedTransactions = await prisma.transaction.findMany({
      where: {
        status: 'FAILED',
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    // Pending transactions
    const pendingTransactions = await prisma.transaction.count({
      where: {
        status: 'PENDING',
      },
    })

    // Calculate profit (assuming we buy data at wholesale and sell at retail)
    // This is simplified - in production, track actual costs
    const totalProfit = (revenueData._sum.amount || 0) * 0.05 // Assume 5% average margin
    const monthlyProfit = (monthlyRevenueData._sum.amount || 0) * 0.05

    // Daily stats for the last 30 days
    const dailyStats = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        status: { in: ['SUCCESS', 'COMPLETED'] },
      },
      _count: true,
      _sum: {
        amount: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          newUsersThisMonth,
          totalTransactions,
          transactionsThisMonth,
          pendingTransactions,
          totalRevenue: revenueData._sum.amount || 0,
          monthlyRevenue: monthlyRevenueData._sum.amount || 0,
          totalProfit,
          monthlyProfit,
        },
        walletFunding: {
          totalVolume: walletFundingData._sum.amount || 0,
          transactionCount: walletFundingData._count,
          monthlyVolume: monthlyWalletFundingData._sum.amount || 0,
        },
        referrals: {
          totalCompleted: totalReferrals,
          totalEarnings: referralEarningsData._sum.amount || 0,
        },
        transactionBreakdown: {
          byStatus: transactionStatus,
          byType: transactionTypes,
          topNetworks: Object.entries(networkCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([network, count]) => ({ network, count })),
        },
        recentIssues: {
          failedTransactions: failedTransactions.map(tx => ({
            id: tx.id,
            reference: tx.reference,
            user: tx.user,
            amount: tx.amount,
            type: tx.type,
            error: (tx.details as Record<string, any>)?.error,
            createdAt: tx.createdAt,
          })),
        },
        trends: {
          dailyStats: dailyStats
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(stat => ({
              date: new Date(stat.createdAt).toISOString().split('T')[0],
              count: stat._count,
              volume: stat._sum.amount || 0,
            })),
        },
      },
    })

  } catch (error: any) {
    console.error('Admin metrics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
})
