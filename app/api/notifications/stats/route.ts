import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Get notification statistics
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const [total, unread, notificationsByType, recentNotifications] = await Promise.all([
      prisma.notification.count({
        where: { userId: decoded.userId },
      }),
      prisma.notification.count({
        where: {
          userId: decoded.userId,
          isRead: false,
        },
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId: decoded.userId },
        _count: true,
      }),
      prisma.notification.findMany({
        where: { userId: decoded.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          createdAt: true,
        },
      }),
    ]);

    // Convert type counts to a more readable format
    const byType: Record<string, number> = {};
    notificationsByType.forEach(item => {
      byType[item.type] = item._count;
    });

    return NextResponse.json({
      total,
      unread,
      byType,
      recent: recentNotifications,
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification statistics' },
      { status: 500 }
    );
  }
}