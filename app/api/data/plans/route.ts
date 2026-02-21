/**
 * Data Plans API
 * GET - Fetch available data plans for a network
 */

import {
  apiHandler,
  successResponse,
  parseQueryParams,
  BadRequestError,
} from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { parseDataSizeToMb } from '@/lib/utils'

const VALID_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const

/**
 * GET /api/data/plans?network=MTN
 * Fetch data plans for a specific network
 * Prioritizes AMIGO plans and uses dynamic database pricing
 */
export const GET = apiHandler(async (request: Request) => {
  const params = parseQueryParams(request.url)
  const network = params.getString('network')?.toUpperCase()

  if (!network || !VALID_NETWORKS.includes(network as any)) {
    throw new BadRequestError('Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE')
  }

  // Check if DATA service is enabled for this network in Pricing table
  const pricing = await prisma.pricing.findFirst({
    where: {
      service: 'DATA',
      network: network,
    },
  })

  // If service is globally disabled, return empty list
  if (pricing && !pricing.isActive) {
    return successResponse([])
  }

  // Fetch active plans from database
  // Also filter by Vendor status - if vendor is disabled, don't show plans
  const dbPlans = await prisma.dataPlan.findMany({
    where: {
      network,
      isActive: true,
      vendor: {
        isEnabled: true,
      }
    },
    include: {
      vendor: true,
    },
    orderBy: {
      sellingPrice: 'asc',
    },
  })

  // Start with manual sorting to prioritize Primary Vendor
  const sortedPlans = dbPlans.sort((a, b) => {
    const isPriorityA = a.vendor.isPrimary || a.vendor.adapterId === 'SUBANDGAIN' // Fallback to SubAndGain if no primary set? Or just rely on isPrimary
    const isPriorityB = b.vendor.isPrimary || b.vendor.adapterId === 'SUBANDGAIN'

    // Prioritize Primary Vendor
    if (isPriorityA && !isPriorityB) return -1
    if (!isPriorityA && isPriorityB) return 1
    
    // If both same priority status, keep price sort (stable sort)
    return a.sellingPrice - b.sellingPrice
  })

  // Map to frontend expected format
  const formattedPlans = sortedPlans.map(plan => {
    const dataCapacity = parseDataSizeToMb(plan.size)
    const profit = plan.sellingPrice - plan.costPrice

    return {
      id: plan.id, // Use Database UUID for consistent purchasing
      name: plan.size, // "1GB"
      network: plan.network,
      costPrice: plan.costPrice,
      sellingPrice: plan.sellingPrice,
      profit,
      validity: plan.validity,
      description: `${plan.validity} plan via ${plan.vendor.vendorName}`,
      planType: plan.planType,
      dataCapacity, // Numeric value for frontend filtering (1024)
      isAvailable: plan.isActive,
      vendorName: plan.vendor.vendorName,
      isPriority: plan.vendor.isPrimary || plan.vendor.adapterId === 'SUBANDGAIN'
    }
  })

  return successResponse({
    network,
    plans: formattedPlans,
    count: formattedPlans.length,
    source: 'database'
  })
})
