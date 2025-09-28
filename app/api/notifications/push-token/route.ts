import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Update push token
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();
    const { token: pushToken, platform } = body;

    if (!pushToken) {
      return NextResponse.json(
        { error: 'Push token is required' },
        { status: 400 }
      );
    }

    // For now, just acknowledge the token (can be enhanced with database storage later)
    console.log(`Push token updated for user ${decoded.userId}: ${pushToken} (${platform})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update push token error:', error);
    return NextResponse.json(
      { error: 'Failed to update push token' },
      { status: 500 }
    );
  }
}

// Remove push token
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // For now, just acknowledge the removal (can be enhanced with database storage later)
    console.log(`Push token removed for user ${decoded.userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove push token error:', error);
    return NextResponse.json(
      { error: 'Failed to remove push token' },
      { status: 500 }
    );
  }
}