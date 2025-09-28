import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Get notification settings
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // For now, return default settings (can be enhanced with database storage later)
    return NextResponse.json({
      pushEnabled: true,
      transactionAlerts: true,
      promotionalOffers: true,
      securityAlerts: true,
      systemUpdates: true,
      emailNotifications: false,
      smsNotifications: false,
      inAppSounds: true,
      vibration: true,
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification settings' },
      { status: 500 }
    );
  }
}

// Update notification settings
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();

    // For now, just return the updated settings (can be enhanced with database storage later)
    return NextResponse.json({
      pushEnabled: true,
      transactionAlerts: true,
      promotionalOffers: true,
      securityAlerts: true,
      systemUpdates: true,
      emailNotifications: false,
      smsNotifications: false,
      inAppSounds: true,
      vibration: true,
      ...body, // Merge with provided settings
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}