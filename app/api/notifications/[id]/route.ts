/**
 * Individual Notification API
 * PATCH - Mark single notification as read
 * DELETE - Delete a notification
 */

import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  NotFoundError,
  ForbiddenError,
} from '@/lib/api-utils'

/**
 * PATCH /api/notifications/[id]
 * Mark a single notification as read
 */
export const PATCH = apiHandler(async (request: Request, context: any) => {
  const user = await getAuthenticatedUser()
  const { id } = context.params

  // Find notification
  const notification = await prisma.notification.findUnique({
    where: { id },
  })

  if (!notification) {
    throw new NotFoundError('Notification not found')
  }

  // Verify ownership
  if (notification.userId !== user.id) {
    throw new ForbiddenError('Access denied')
  }

  // Mark as read
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  })

  return successResponse({
    notification: updated,
    message: 'Notification marked as read',
  })
})

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export const DELETE = apiHandler(async (request: Request, context: any) => {
  const user = await getAuthenticatedUser()
  const { id } = context.params

  // Find notification
  const notification = await prisma.notification.findUnique({
    where: { id },
  })

  if (!notification) {
    throw new NotFoundError('Notification not found')
  }

  // Verify ownership
  if (notification.userId !== user.id) {
    throw new ForbiddenError('Access denied')
  }

  // Delete notification
  await prisma.notification.delete({
    where: { id },
  })

  return successResponse({
    message: 'Notification deleted successfully',
  })
})
