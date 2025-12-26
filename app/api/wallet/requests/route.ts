/**
 * Get Money Requests API
 * GET - Fetch sent/received requests
 */

import { walletService } from '@/lib/services/WalletService'
import {
    apiHandler,
    successResponse,
    getAuthenticatedUser,
    parseQueryParams,
    getPaginationParams
} from '@/lib/api-utils'

/**
 * GET /api/wallet/requests
 * Fetch user money requests
 * Query params:
 *  - type (all, sent, received)
 *  - status (PENDING, PAID, DECLINED, CANCELLED)
 *  - page, limit
 */
export const GET = apiHandler(async (request: Request) => {
    const user = await getAuthenticatedUser(request)
    const params = parseQueryParams(request.url)
    const type = params.getString('type', 'all')
    const status = params.getString('status')
    const { limit, page } = getPaginationParams(request.url, 20)

    const result = await walletService.getRequests(user.id, {
        page,
        limit,
        type,
        status
    })

    return successResponse(result)
})
