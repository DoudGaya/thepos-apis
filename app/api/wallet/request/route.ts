/**
 * Request Money API
 * POST - Request funds from another user
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { walletService } from '@/lib/services/WalletService'
import {
    apiHandler,
    successResponse,
    getAuthenticatedUser,
    validateRequestBody,
    BadRequestError,
    NotFoundError,
} from '@/lib/api-utils'

// Request validation schema
const requestSchema = z.object({
    recipientEmail: z.string().email('Invalid email address').optional(),
    recipientPhone: z.string().optional(),
    recipientId: z.string().optional(),
    amount: z.number().min(1, 'Minimum request amount is ₦1').max(1000000, 'Maximum request amount is ₦1,000,000'),
    note: z.string().optional(),
})

/**
 * POST /api/wallet/request
 * Request funds from another user
 */
export const POST = apiHandler(async (request: Request) => {
    const requester = await getAuthenticatedUser(request)
    const data = (await validateRequestBody(request, requestSchema)) as z.infer<typeof requestSchema>

    // Resolve recipient (the person being requested to pay)
    let payer;
    if (data.recipientId) {
        payer = await prisma.user.findUnique({ where: { id: data.recipientId } });
    } else if (data.recipientEmail) {
        payer = await prisma.user.findUnique({ where: { email: data.recipientEmail } });
    } else if (data.recipientPhone) {
        payer = await prisma.user.findUnique({ where: { phone: data.recipientPhone } });
    } else {
        throw new BadRequestError('Recipient identifier (email, phone, or ID) is required');
    }

    if (!payer) {
        throw new NotFoundError('User not found')
    }

    // Prevent self-request
    if (payer.id === requester.id) {
        throw new BadRequestError('Cannot request money from yourself')
    }

    // Use WalletService to create the request
    const result = await walletService.requestMoney(
        requester.id,
        payer.id,
        data.amount,
        data.note
    );

    return successResponse({
        request: result,
        payer: {
            email: payer.email,
            name: `${payer.firstName} ${payer.lastName}`,
        },
    }, 'Request sent successfully')
})
