import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Get wallet balance
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Get user with balance
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { credits: true, updatedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      available: user.credits,
      pending: 0, // For now, no pending balance logic
      total: user.credits,
      lastUpdated: user.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Wallet balance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    );
  }
}
