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
import { getAllPlansForNetwork } from '@/lib/constants/data-plans'

const VALID_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'] as const

/**
 * GET /api/data/plans?network=MTN
 * Fetch data plans for a specific network
 * Each plan has a fixed ₦100 profit margin
 */
export const GET = apiHandler(async (request: Request) => {
  const params = parseQueryParams(request.url)
  const network = params.getString('network')?.toUpperCase()

  if (!network || !VALID_NETWORKS.includes(network as any)) {
    throw new BadRequestError('Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE')
  }

  // Get plans for network with ₦100 margin
  const plans = getAllPlansForNetwork(network as typeof VALID_NETWORKS[number])

  return successResponse({
    network,
    plans,
    count: plans.length,
    profitMargin: 100, // Fixed ₦100 profit margin
  })
})
