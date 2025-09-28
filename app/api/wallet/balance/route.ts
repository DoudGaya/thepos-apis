import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get wallet balance
export async function GET(request: NextRequest) {
  try {
    // Get user ID from middleware-set headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user with balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        credits: true, 
        updatedAt: true,
        firstName: true,
        lastName: true,
        email: true
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return data in format expected by frontend
    return NextResponse.json({
      available: user.credits,
      pending: 0,
      total: user.credits,
      lastUpdated: user.updatedAt.toISOString(),
    });

  } catch (error: any) {
    console.error('Wallet balance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance', details: error.message }, 
      { status: 500 }
    );
  }
}
