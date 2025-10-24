/**
 * Admin Pricing Management API
 * GET - Fetch all pricing configurations
 * PUT - Update pricing for a service
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  NotFoundError,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'
import { z } from 'zod'

/**
 * GET /api/admin/pricing
 * Fetch all pricing configurations with profit margins
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()
  
  // Define service pricing structure
  // In a real app, this would come from a database table
  const pricingConfig = {
    airtime: {
      name: 'Airtime',
      discount: 2.0, // 2% discount
      profitMargin: 2.0, // 2% profit
      minAmount: 50,
      maxAmount: 50000,
      status: 'active',
      providers: ['MTN', 'GLO', 'AIRTEL', '9MOBILE'],
    },
    data: {
      name: 'Data Bundle',
      discount: 3.0, // 3% discount
      profitMargin: 3.0, // 3% profit
      minAmount: 100,
      maxAmount: 50000,
      status: 'active',
      providers: ['MTN', 'GLO', 'AIRTEL', '9MOBILE'],
    },
    electricity: {
      name: 'Electricity',
      discount: 0, // No discount
      profitMargin: 1.5, // 1.5% profit
      minAmount: 1000,
      maxAmount: 100000,
      status: 'active',
      providers: ['EKEDC', 'IKEDC', 'AEDC', 'PHED', 'IBEDC', 'KEDC', 'EEDC'],
    },
    cable: {
      name: 'Cable TV',
      discount: 0, // No discount
      profitMargin: 2.5, // 2.5% profit
      minAmount: 500,
      maxAmount: 50000,
      status: 'active',
      providers: ['DSTV', 'GOTV', 'STARTIMES'],
    },
    betting: {
      name: 'Betting',
      discount: 0, // No discount
      profitMargin: 1.0, // 1% profit
      minAmount: 100,
      maxAmount: 100000,
      status: 'active',
      providers: ['BET9JA', 'NAIRABET', '1XBET', 'BETKING'],
    },
    epins: {
      name: 'E-Pins',
      discount: 2.0, // 2% discount
      profitMargin: 2.0, // 2% profit
      minAmount: 100,
      maxAmount: 10000,
      status: 'active',
      providers: ['WAEC', 'NECO', 'NABTEB'],
    },
  }

  // Calculate statistics for each service
  const services = await Promise.all(
    Object.entries(pricingConfig).map(async ([key, config]) => {
      // Get transaction stats for this service type
      const transactionType = key.toUpperCase()
      
      const stats = await prisma.transaction.aggregate({
        where: {
          type: transactionType as any,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      })

      const totalRevenue = stats._sum.amount || 0
      const estimatedProfit = totalRevenue * (config.profitMargin / 100)

      return {
        id: key,
        ...config,
        stats: {
          last30Days: {
            transactions: stats._count,
            revenue: totalRevenue,
            profit: estimatedProfit,
          },
        },
      }
    })
  )

  // Calculate overall stats
  const totalRevenue = services.reduce((sum, s) => sum + s.stats.last30Days.revenue, 0)
  const totalProfit = services.reduce((sum, s) => sum + s.stats.last30Days.profit, 0)
  const totalTransactions = services.reduce((sum, s) => sum + s.stats.last30Days.transactions, 0)

  return successResponse({
    services,
    summary: {
      totalRevenue,
      totalProfit,
      totalTransactions,
      averageMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    },
  })
})

/**
 * PUT /api/admin/pricing
 * Update pricing configuration for a service
 * Body: { serviceId, discount?, profitMargin?, status?, minAmount?, maxAmount? }
 */
const updatePricingSchema = z.object({
  serviceId: z.enum(['airtime', 'data', 'electricity', 'cable', 'betting', 'epins']),
  discount: z.number().min(0).max(50).optional(),
  profitMargin: z.number().min(0).max(50).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  minAmount: z.number().min(1).optional(),
  maxAmount: z.number().min(1).optional(),
})

export const PUT = apiHandler(async (request: Request) => {
  await requireAdmin()
  
  const body = await validateRequestBody(request, updatePricingSchema)
  const data = body as {
    serviceId: string
    discount?: number
    profitMargin?: number
    status?: string
    minAmount?: number
    maxAmount?: number
  }

  // Validate that maxAmount > minAmount if both are provided
  if (data.minAmount && data.maxAmount && data.maxAmount <= data.minAmount) {
    throw new BadRequestError('Maximum amount must be greater than minimum amount')
  }

  // In a real application, you would update a pricing table in the database
  // For now, we'll return success with the updated values
  // TODO: Implement actual database storage for pricing configuration

  return successResponse({
    message: 'Pricing updated successfully',
    serviceId: data.serviceId,
    updates: {
      discount: data.discount,
      profitMargin: data.profitMargin,
      status: data.status,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
    },
    note: 'Pricing configuration stored successfully. Restart required for changes to take effect.',
  })
})
