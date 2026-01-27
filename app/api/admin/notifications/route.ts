
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { notificationService } from '@/lib/services/NotificationService';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

// POST /api/admin/notifications - Send notification
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };

        // Verify Admin Role
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { role: true }
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 });
        }

        const body = await request.json();
        const { title, message, audience, type, userId } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message required' }, { status: 400 });
        }

        let result;
        if (userId) {
            // Send to specific user
            result = await notificationService.notifyUser(userId, title, message, type as NotificationType || 'GENERAL');
        } else {
            // Broadcast
            result = await notificationService.broadcast(title, message, audience || 'ALL', type as NotificationType || 'GENERAL');
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
}
