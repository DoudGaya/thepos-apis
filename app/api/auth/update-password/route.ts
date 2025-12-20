/**
 * Update Password API
 * POST - Update user password
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

// Update password validation schema
const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(8, 'New password must be at least 8 characters')
        .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'New password must contain at least one number'),
})

/**
 * POST /api/auth/update-password
 * Update user password
 * Body: { currentPassword: "oldpass", newPassword: "NewPass123" }
 */
export const POST = apiHandler(async (request: Request) => {
    const user = await getAuthenticatedUser(request)
    const data = await validateRequestBody(request, updatePasswordSchema) as z.infer<typeof updatePasswordSchema>

    // Get user with current password
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, password: true },
    })

    if (!dbUser) {
        throw new BadRequestError('User not found')
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(data.currentPassword, dbUser.password)
    if (!isCurrentPasswordValid) {
        throw new BadRequestError('Current password is incorrect')
    }

    // Check new password is different
    if (data.currentPassword === data.newPassword) {
        throw new BadRequestError('New password must be different from current password')
    }

    // Hash and update to new password
    const newPasswordHash = await hashPassword(data.newPassword)

    await prisma.user.update({
        where: { id: user.id },
        data: { password: newPasswordHash },
    })

    return successResponse(
        { success: true },
        'Password updated successfully'
    )
})
