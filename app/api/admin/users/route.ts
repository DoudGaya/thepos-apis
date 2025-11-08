/**
 * Admin User Management API
 * GET - List all users with filters
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  requireAdmin,
  getPaginationParams,
  parseQueryParams,
} from '@/lib/api-utils'

/**
 * GET /api/admin/users
 * List all users with search and filters
 * Query params:
 *  - search (name, email, phone)
 *  - role (USER, ADMIN)
 *  - status (Active, Suspended)
 *  - page, limit
 */
export const GET = apiHandler(async (request: Request) => {
  await requireAdmin()
  
  const params = parseQueryParams(request.url)
  const search = params.getString('search')
  const role = params.getString('role')
  const status = params.getString('status')
  const { limit, skip, page } = getPaginationParams(request.url, 20)

  // Build where clause
  const where: any = {}

  // Search in name, email, or phone
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Filter by role
  if (role && (role === 'USER' || role === 'ADMIN')) {
    where.role = role
  }

  // Filter by status (assuming we have an isActive field or use deletedAt)
  if (status === 'Suspended') {
    // Implement based on your schema - could be isActive: false or a suspension field
    // For now, we'll skip this or you can add a suspended field to the schema
  }

  // Fetch users with pagination
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true,
            referrals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    }),
    prisma.user.count({ where }),
  ])

  // Enhance user data with additional stats
  const enhancedUsers = await Promise.all(
    users.map(async (user) => {
      // Get total spent
      const totalSpent = await prisma.transaction.aggregate({
        where: {
          userId: user.id,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      })

      // Get last transaction
      const lastTransaction = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
          type: true,
          amount: true,
        },
      })

      return {
        ...user,
        totalSpent: totalSpent._sum.amount || 0,
        lastTransaction,
        isActive: true, // Implement based on your business logic
      }
    })
  )

  return successResponse({
    users: enhancedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})
