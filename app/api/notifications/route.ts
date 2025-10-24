/**
 * User Notifications API
 * GET - Fetch user notifications
 * DELETE - Mark all as read
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  getPaginationParams,
  createPaginatedResponse,
  parseQueryParams,
} from '@/lib/api-utils'

/**
 * GET /api/notifications
 * Fetch user notifications with pagination
 * Query params:
 *  - type (TRANSACTION, GENERAL, SYSTEM)
 *  - unreadOnly (boolean)
 *  - page, limit
 */
export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const params = parseQueryParams(request.url)
  const type = params.getString('type')
  const unreadOnly = params.getBoolean('unreadOnly', false)
  const { limit, skip, page } = getPaginationParams(request.url, 20)

  // Build where clause
  const where: any = { userId: user.id }

  if (type) {
    where.type = type
  }

  if (unreadOnly) {
    where.isRead = false
  }

  // Fetch notifications with pagination
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    }),
  ])

  return successResponse({
    notifications: createPaginatedResponse(notifications, total, page, limit),
    unreadCount,
  })
})

/**
 * DELETE /api/notifications
 * Mark all notifications as read
 */
export const DELETE = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()

  // Update all unread notifications
  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return successResponse({
    message: 'All notifications marked as read',
    count: result.count,
  })
})
