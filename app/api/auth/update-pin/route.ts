/**
 * Update PIN API
 * POST - Update existing transaction PIN
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, comparePassword } from '@/lib/auth'
import {
    apiHandler,
    successResponse,
    getAuthenticatedUser,
    validateRequestBody,
    BadRequestError,
} from '@/lib/api-utils'

// Update PIN validation schema
const updatePinSchema = z.object({
    currentPin: z.string()
        .min(4, 'Current PIN must be at least 4 digits')
        .max(6, 'Current PIN must be at most 6 digits'),
    newPin: z.string()
        .min(4, 'New PIN must be at least 4 digits')
        .max(6, 'New PIN must be at most 6 digits')
        .regex(/^\d+$/, 'New PIN must contain only numbers'),
})

/**
 * POST /api/auth/update-pin
 * Update existing transaction PIN
 * Body: { currentPin: "1234", newPin: "5678" }
 */
export const POST = apiHandler(async (request: Request) => {
    const user = await getAuthenticatedUser(request)
    const data = await validateRequestBody(request, updatePinSchema) as z.infer<typeof updatePinSchema>

    // Get user with current PIN
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, pinHash: true },
    })

    if (!dbUser?.pinHash) {
        throw new BadRequestError('PIN not set. Please set a PIN first.')
    }

    // Verify current PIN
    const isCurrentPinValid = await comparePassword(data.currentPin, dbUser.pinHash)
    if (!isCurrentPinValid) {
        throw new BadRequestError('Current PIN is incorrect')
    }

    // Hash and update to new PIN
    const newPinHash = await hashPassword(data.newPin)

    await prisma.user.update({
        where: { id: user.id },
        data: { pinHash: newPinHash },
    })

    return successResponse(
        { success: true },
        'Transaction PIN updated successfully'
    )
})
