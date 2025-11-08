/**
 * Data Plans API
 * GET - Fetch available data plans for a network from Amigo (primary vendor)
 */

import { vendorService } from '@/lib/vendors'
import {
  apiHandler,
  successResponse,
  parseQueryParams,
  BadRequestError,
} from '@/lib/api-utils'
import { NetworkType } from '@/lib/vendors/adapter.interface'

const VALID_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']
const PROFIT_MARGIN = 100 // ₦100 profit per data bundle

/**
 * GET /api/data/plans?network=MTN
 * Fetch data plans for a specific network from Amigo
 * Returns vendor cost price + ₦100 profit margin as selling price
 */
export const GET = apiHandler(async (request: Request) => {
  const params = parseQueryParams(request.url)
  const network = params.getString('network')?.toUpperCase()

  if (!network || !VALID_NETWORKS.includes(network)) {
    throw new BadRequestError('Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE')
  }

  // Fetch plans from Amigo (primary vendor)
  const plans = await vendorService.getPlans('DATA', network as NetworkType)

  // Transform plans with profit margin applied
  const transformedPlans = plans.map(plan => ({
    id: plan.id,
    name: plan.name,
    network: plan.network,
    costPrice: plan.price, // Vendor cost price (Amigo's price)
    sellingPrice: plan.price + PROFIT_MARGIN, // Final price shown to user
    profit: PROFIT_MARGIN,
    validity: plan.validity || 'N/A',
    description: plan.metadata?.efficiency_label || '',
    dataCapacity: plan.metadata?.data_capacity_gb || 0,
    isAvailable: plan.isAvailable,
  }))

  return successResponse({
    network,
    plans: transformedPlans,
    count: transformedPlans.length,
    profitMargin: PROFIT_MARGIN,
  })
})
