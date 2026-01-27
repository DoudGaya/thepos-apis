
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// POST /api/users/push-token - Register or update push token
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const { pushToken } = await request.json();
        console.log(`[PushTokenAPI] Hit by user: ${decoded.userId}, Token: ${pushToken}`);

        if (!pushToken) {
            console.error('[PushTokenAPI] Error: Push token missing in request body');
            return NextResponse.json({ error: 'Push token required' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: decoded.userId },
            data: { pushToken },
        });

        console.log(`[PushTokenAPI] Successfully updated DB for user: ${updatedUser.email}`);

        return NextResponse.json({ success: true, message: 'Push token registered' });
    } catch (error) {
        console.error('Push token registration error:', error);
        return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
    }
}
