/**
 * User Profile API
 * GET - Fetch user profile
 * PUT - Update user profile
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  NotFoundError,
} from '@/lib/api-utils'

// Update profile validation schema
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().min(11, 'Phone number must be at least 11 digits').optional(),
})

/**
 * GET /api/user
 * Fetch authenticated user's profile
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      credits: true,
      referralCode: true,
      referredBy: true,
      createdAt: true,
      transactions: { select: { id: true } },
      referrals: { select: { id: true } },
    },
  })

  if (!profile) {
    throw new NotFoundError('User profile not found')
  }

  // Get transaction stats
  const stats = await prisma.transaction.aggregate({
    where: {
      userId: user.id,
      status: 'COMPLETED',
    },
    _sum: {
      amount: true,
    },
  })

  return successResponse({
    ...profile,
    stats: {
      totalTransactions: profile.transactions.length,
      totalSpent: stats._sum.amount || 0,
      totalReferrals: profile.referrals.length,
    },
  })
})

/**
 * PUT /api/user
 * Update user profile
 */
export const PUT = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, updateProfileSchema)) as z.infer<typeof updateProfileSchema>

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.phone && { phone: data.phone }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      credits: true,
      referralCode: true,
    },
  })

  return successResponse(updatedUser, 'Profile updated successfully')
})
