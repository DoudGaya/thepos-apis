/**
 * Change Password API
 * POST - Change user password
 */

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'

// Change password validation schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * POST /api/user/password
 * Change user password
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, changePasswordSchema)) as z.infer<typeof changePasswordSchema>

  // Get user with password hash
  const userWithPassword = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
    },
  })

  if (!userWithPassword || !userWithPassword.passwordHash) {
    throw new BadRequestError('User not found')
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(
    data.currentPassword,
    userWithPassword.passwordHash
  )

  if (!isValidPassword) {
    throw new BadRequestError('Current password is incorrect')
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(data.newPassword, 10)

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashedPassword },
  })

  return successResponse(null, 'Password changed successfully')
})
