/**
 * Data Plans API
 * GET - Fetch available data plans for a network
 */

import vtuService from '@/lib/vtu'
import {
  apiHandler,
  successResponse,
  parseQueryParams,
  BadRequestError,
} from '@/lib/api-utils'

const VALID_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE']

/**
 * GET /api/data/plans?network=MTN
 * Fetch data plans for a specific network
 */
export const GET = apiHandler(async (request: Request) => {
  const params = parseQueryParams(request.url)
  const network = params.getString('network')?.toUpperCase()

  if (!network || !VALID_NETWORKS.includes(network)) {
    throw new BadRequestError('Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE')
  }

  // Fetch plans from VTU.NG
  const plans = await vtuService.getDataPlans(network as any)

  // Transform plans for frontend
  const transformedPlans = plans.map(plan => ({
    id: plan.plan_id,
    name: plan.name,
    price: plan.amount,
    validity: plan.validity,
    network: plan.network.toUpperCase(),
  }))

  return successResponse({
    network,
    plans: transformedPlans,
    count: transformedPlans.length,
  })
})
