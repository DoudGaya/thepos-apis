
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/NotificationService';
import { NotificationType } from '@prisma/client';
import { PERMISSIONS } from '@/lib/rbac';
import { apiHandler, requirePermission, successResponse, BadRequestError } from '@/lib/api-utils';

// POST /api/admin/notifications - Send notification
export const POST = apiHandler(async (request: Request) => {
    await requirePermission(PERMISSIONS.NOTIFICATIONS_SEND, request);

    const body = await request.json();
    const { title, message, audience, type, userId } = body;

    if (!title || !message) {
        throw new BadRequestError('Title and message required');
    }

    let result;
    if (userId) {
        // Send to specific user
        result = await notificationService.notifyUser(userId, title, message, type as NotificationType || 'GENERAL');
    } else {
        // Broadcast
        result = await notificationService.broadcast(title, message, audience || 'ALL', type as NotificationType || 'GENERAL');
    }

    return successResponse(result);
});
