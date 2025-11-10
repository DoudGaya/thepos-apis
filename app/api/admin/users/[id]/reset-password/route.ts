/**
 * Admin Reset User Password API
 * POST - Reset a user's password
 */

import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  NotFoundError,
  validateRequestBody,
} from '@/lib/api-utils'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset user password
 */
export const POST = apiHandler(async (request: Request, context: any) => {
  await requireAdmin()

  const { id } = context.params
  const data = (await validateRequestBody(request, resetPasswordSchema)) as z.infer<typeof resetPasswordSchema>

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Hash new password
  const passwordHash = await hashPassword(data.password)

  // Update password
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
    },
  })

  // Create notification
  await prisma.notification.create({
    data: {
      userId: id,
      type: 'SECURITY',
      title: 'Password Reset',
      message: 'Your password has been reset by an administrator. Please log in with your new password.',
    },
  })

  return successResponse(
    {
      message: 'Password reset successfully',
    },
    'Password has been reset. User will need to log in again.'
  )
})
