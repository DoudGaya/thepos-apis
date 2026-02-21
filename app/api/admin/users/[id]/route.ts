/**
 * Admin User Details API
 * GET - Fetch detailed information about a specific user
 * PATCH - Update user status/role
 */

import { prisma } from '@/lib/prisma'
import { PERMISSIONS } from '@/lib/rbac'
import {
  apiHandler,
  successResponse,
  requirePermission,
  NotFoundError,
  validateRequestBody,
  getPaginationParams,
  createPaginatedResponse,
} from '@/lib/api-utils'
import { z } from 'zod'

/**
 * GET /api/admin/users/[id]
 * Fetch detailed user information including stats
 */
export const GET = apiHandler(async (request: Request, context: any) => {
  await requirePermission(PERMISSIONS.USERS_VIEW, request)
  
  const { id } = await context.params

  // Fetch user with all details
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      credits: true,
      referralCode: true,
      referredBy: true,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Get transaction statistics
  const [
    transactionStats,
    recentTransactions,
    referralCount,
    referralEarnings,
  ] = await Promise.all([
    // Transaction stats
    prisma.transaction.aggregate({
      where: {
        userId: id,
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
      _count: true,
    }),
    // Recent transactions
    prisma.transaction.findMany({
      where: {
        userId: id,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        reference: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    }),
    // Referral count
    prisma.referral.count({
      where: {
        referrerId: id,
      },
    }),
    // Referral earnings
    prisma.referralEarning.aggregate({
      where: {
        userId: id,
      },
      _sum: {
        amount: true,
      },
    }),
  ])

  // Get transaction breakdown by type
  const transactionsByType = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId: id,
      status: 'COMPLETED',
    },
    _sum: {
      amount: true,
    },
    _count: true,
  })

  // Get referrer information if user was referred
  let referrer: any = null
  if (user.referredBy) {
    referrer = await prisma.user.findUnique({
      where: { referralCode: user.referredBy },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })
  }

  return successResponse({
    user: {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
    },
    stats: {
      totalTransactions: transactionStats._count,
      totalSpent: transactionStats._sum.amount || 0,
      totalReferrals: referralCount,
      totalReferralEarnings: referralEarnings._sum.amount || 0,
      transactionsByType: transactionsByType.map(item => ({
        type: item.type,
        count: item._count,
        total: item._sum.amount || 0,
      })),
    },
    recentTransactions,
    referrer,
  })
})

/**
 * PATCH /api/admin/users/[id]
 * Update user status or role
 */
const updateUserSchema = z.object({
  role: z.enum(['USER', 'ADMIN']).optional(),
  isVerified: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
})

export const PATCH = apiHandler(async (request: Request, context: any) => {
  await requirePermission(PERMISSIONS.USERS_EDIT, request)
  
  const { id } = await context.params
  const input = await validateRequestBody<z.infer<typeof updateUserSchema>>(request, updateUserSchema)

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Calculate new verification states
  const newEmailVerified =
    input.emailVerified !== undefined
      ? input.emailVerified
        ? new Date()
        : null
      : user.emailVerified

  const newPhoneVerified =
    input.phoneVerified !== undefined
      ? input.phoneVerified
      : user.phoneVerified

  // Verification status logic:
  // If explicitly provided in input, use that
  // Otherwise, auto-calculate based on email & phone verification
  let newIsVerified = input.isVerified
  
  if (newIsVerified === undefined) {
    // Only auto-calculate if not explicitly setting it
    // If either changed, re-calculate
    if (input.emailVerified !== undefined || input.phoneVerified !== undefined) {
      newIsVerified = !!newEmailVerified && !!newPhoneVerified
    } else {
      newIsVerified = user.isVerified
    }
  }

  // Prepare update data
  const updateData: any = {
    ...input,
    emailVerified: newEmailVerified,
    phoneVerified: newPhoneVerified,
    isVerified: newIsVerified,
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      updatedAt: true,
    },
  })

  // Create notification for user
  await prisma.notification.create({
    data: {
      userId: id,
      type: 'GENERAL',
      title: 'Account Updated',
      message: `Your account has been updated by an administrator.`,
    },
  })

  return successResponse({
    user: updatedUser,
    message: 'User updated successfully',
  })
})
