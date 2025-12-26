/**
 * Respond to Money Request API
 * POST - Accept or Decline a money request
 */

import { z } from 'zod'
import { walletService } from '@/lib/services/WalletService'
import {
    apiHandler,
    successResponse,
    getAuthenticatedUser,
    validateRequestBody,
    BadRequestError,
} from '@/lib/api-utils'

// Response validation schema
const responseSchema = z.object({
    action: z.enum(['approve', 'decline']),
    pin: z.string().optional(), // Required only for approval
})

/**
 * POST /api/wallet/request/[id]/respond
 * Respond to a money request
 */
export const POST = apiHandler(async (request: Request, context: any) => {
    const user = await getAuthenticatedUser(request)
    const { id } = await context.params;
    const data = (await validateRequestBody(request, responseSchema)) as z.infer<typeof responseSchema>

    if (data.action === 'approve' && !data.pin) {
        throw new BadRequestError('PIN is required to approve request');
    }

    try {
        const result = await walletService.respondToRequest(
            user.id,
            id,
            data.action,
            data.pin
        );

        return successResponse({
            request: result,
        }, `Request ${data.action}d successfully`)
    } catch (error: any) {
        if (error.message === 'Invalid PIN') {
            throw new BadRequestError('Invalid Transaction PIN');
        }
        if (error.message === 'Insufficient funds') {
            throw new BadRequestError('Insufficient wallet balance');
        }
        throw error;
    }
})
