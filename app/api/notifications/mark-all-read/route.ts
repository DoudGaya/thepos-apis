/**
 * Mark All Notifications as Read API
 * POST - Mark all user notifications as read
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
} from '@/lib/api-utils'

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
export const POST = apiHandler(async (request: Request) => {
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
