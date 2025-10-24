/**
 * Pricing Service
 * 
 * Handles profit margin calculations and pricing logic for all services.
 * Supports both fixed amount and percentage-based margins.
 */

import { prisma } from '../prisma'
import { ServiceType, NetworkType, VendorName } from '../vendors/adapter.interface'

export interface PriceCalculationRequest {
  service: ServiceType
  network?: NetworkType
  costPrice: number
  vendorName?: VendorName | null
}

export interface PriceCalculationResult {
  costPrice: number
  sellingPrice: number
  profit: number
  margin: {
    type: 'FIXED' | 'PERCENTAGE'
    value: number
  }
}

export interface ProfitMarginCreate {
  service: ServiceType
  vendorName?: VendorName | null
  marginType: 'FIXED' | 'PERCENTAGE'
  marginValue: number
  minAmount?: number
  maxAmount?: number
  network?: NetworkType | null
  isActive?: boolean
}

export interface ProfitMarginUpdate {
  marginType?: 'FIXED' | 'PERCENTAGE'
  marginValue?: number
  minAmount?: number | null
  maxAmount?: number | null
  isActive?: boolean
}

export class PricingService {
  /**
   * Calculate selling price and profit based on cost price and configured margins
   */
  async calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResult> {
    // Find the most specific applicable profit margin
    // Priority: vendor + network > vendor > network > global
    const margin = await prisma.profitMargin.findFirst({
      where: {
        service: request.service,
        isActive: true,
        OR: [
          // Most specific: vendor + network
          {
            vendorName: request.vendorName,
            network: request.network,
          },
          // Vendor-specific
          {
            vendorName: request.vendorName,
            network: null,
          },
          // Network-specific
          {
            vendorName: null,
            network: request.network,
          },
          // Global default
          {
            vendorName: null,
            network: null,
          },
        ],
        // Amount range constraints
        ...(request.costPrice && {
          AND: [
            {
              OR: [
                { minAmount: null },
                { minAmount: { lte: request.costPrice } },
              ],
            },
            {
              OR: [
                { maxAmount: null },
                { maxAmount: { gte: request.costPrice } },
              ],
            },
          ],
        }),
      },
      orderBy: [
        // Prefer more specific margins
        { vendorName: 'desc' }, // vendor-specific first
        { network: 'desc' },    // network-specific second
        { createdAt: 'desc' },  // newest first
      ],
    })

    if (!margin) {
      throw new Error(`No profit margin configured for ${request.service}`)
    }

    // Calculate profit based on margin type
    let profit = 0
    if (margin.marginType === 'FIXED') {
      profit = margin.marginValue
    } else {
      // PERCENTAGE
      profit = (request.costPrice * margin.marginValue) / 100
    }

    const sellingPrice = request.costPrice + profit

    return {
      costPrice: request.costPrice,
      sellingPrice,
      profit,
      margin: {
        type: margin.marginType as 'FIXED' | 'PERCENTAGE',
        value: margin.marginValue,
      },
    }
  }

  /**
   * Get all profit margins (optionally filtered by service)
   */
  async getMargins(service?: ServiceType): Promise<any[]> {
    return await prisma.profitMargin.findMany({
      where: service ? { service, isActive: true } : { isActive: true },
      orderBy: [
        { service: 'asc' },
        { vendorName: 'asc' },
        { network: 'asc' },
      ],
    })
  }

  /**
   * Get a specific profit margin by ID
   */
  async getMargin(id: string): Promise<any | null> {
    return await prisma.profitMargin.findUnique({
      where: { id },
    })
  }

  /**
   * Create a new profit margin
   */
  async createMargin(data: ProfitMarginCreate): Promise<any> {
    // Check if margin already exists
    const existing = await prisma.profitMargin.findFirst({
      where: {
        service: data.service,
        vendorName: data.vendorName || null,
        network: data.network || null,
      },
    })

    if (existing) {
      throw new Error(
        `Profit margin already exists for ${data.service}` +
        (data.vendorName ? ` (${data.vendorName})` : '') +
        (data.network ? ` (${data.network})` : '')
      )
    }

    return await prisma.profitMargin.create({
      data: {
        service: data.service,
        vendorName: data.vendorName || null,
        marginType: data.marginType,
        marginValue: data.marginValue,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        network: data.network || null,
        isActive: data.isActive ?? true,
      },
    })
  }

  /**
   * Update an existing profit margin
   */
  async updateMargin(id: string, data: ProfitMarginUpdate): Promise<any> {
    return await prisma.profitMargin.update({
      where: { id },
      data: {
        ...(data.marginType && { marginType: data.marginType }),
        ...(data.marginValue !== undefined && { marginValue: data.marginValue }),
        ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
        ...(data.maxAmount !== undefined && { maxAmount: data.maxAmount }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })
  }

  /**
   * Delete a profit margin
   */
  async deleteMargin(id: string): Promise<any> {
    return await prisma.profitMargin.delete({
      where: { id },
    })
  }

  /**
   * Activate/deactivate a profit margin
   */
  async setMarginActive(id: string, isActive: boolean): Promise<any> {
    return await prisma.profitMargin.update({
      where: { id },
      data: { isActive },
    })
  }

  /**
   * Get profit margin summary by service
   */
  async getMarginSummary(): Promise<
    Array<{
      service: string
      totalMargins: number
      activeMargins: number
      avgPercentage: number | null
      avgFixed: number | null
    }>
  > {
    const margins = await prisma.profitMargin.findMany()

    const summary = new Map<string, any>()

    for (const margin of margins) {
      if (!summary.has(margin.service)) {
        summary.set(margin.service, {
          service: margin.service,
          totalMargins: 0,
          activeMargins: 0,
          percentageMargins: [],
          fixedMargins: [],
        })
      }

      const item = summary.get(margin.service)
      item.totalMargins++
      
      if (margin.isActive) {
        item.activeMargins++
      }

      if (margin.marginType === 'PERCENTAGE') {
        item.percentageMargins.push(margin.marginValue)
      } else {
        item.fixedMargins.push(margin.marginValue)
      }
    }

    // Calculate averages
    const result = []
    for (const [service, data] of summary.entries()) {
      result.push({
        service,
        totalMargins: data.totalMargins,
        activeMargins: data.activeMargins,
        avgPercentage:
          data.percentageMargins.length > 0
            ? data.percentageMargins.reduce((a: number, b: number) => a + b, 0) /
              data.percentageMargins.length
            : null,
        avgFixed:
          data.fixedMargins.length > 0
            ? data.fixedMargins.reduce((a: number, b: number) => a + b, 0) /
              data.fixedMargins.length
            : null,
      })
    }

    return result
  }

  /**
   * Calculate total profit for a date range
   */
  async calculateTotalProfit(startDate?: Date, endDate?: Date): Promise<{
    totalProfit: number
    totalTransactions: number
    avgProfit: number
  }> {
    const where: any = {
      status: 'SUCCESS',
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        profit: true,
      },
      _count: true,
      _avg: {
        profit: true,
      },
    })

    return {
      totalProfit: result._sum.profit || 0,
      totalTransactions: result._count,
      avgProfit: result._avg.profit || 0,
    }
  }

  /**
   * Get profit breakdown by service type
   */
  async getProfitByService(startDate?: Date, endDate?: Date): Promise<
    Array<{
      service: string
      totalProfit: number
      totalTransactions: number
      avgProfit: number
    }>
  > {
    const where: any = {
      status: 'SUCCESS',
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const result = await prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        profit: true,
      },
      _count: true,
      _avg: {
        profit: true,
      },
    })

    return result.map((item) => ({
      service: item.type,
      totalProfit: item._sum.profit || 0,
      totalTransactions: item._count,
      avgProfit: item._avg.profit || 0,
    }))
  }

  /**
   * Get profit breakdown by vendor
   */
  async getProfitByVendor(startDate?: Date, endDate?: Date): Promise<
    Array<{
      vendor: string
      totalProfit: number
      totalTransactions: number
      avgProfit: number
    }>
  > {
    const where: any = {
      status: 'SUCCESS',
      vendorName: { not: null },
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const result = await prisma.transaction.groupBy({
      by: ['vendorName'],
      where,
      _sum: {
        profit: true,
      },
      _count: true,
      _avg: {
        profit: true,
      },
    })

    return result.map((item) => ({
      vendor: item.vendorName || 'Unknown',
      totalProfit: item._sum.profit || 0,
      totalTransactions: item._count,
      avgProfit: item._avg.profit || 0,
    }))
  }
}

// Export singleton instance
export const pricingService = new PricingService()
