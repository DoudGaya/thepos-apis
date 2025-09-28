import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Test wallet funding endpoint - for development/testing only
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (amount < 100) {
      return NextResponse.json(
        { error: 'Minimum funding amount is ₦100' },
        { status: 400 }
      );
    }

    // Generate unique reference
    const transactionRef = `TEST_FUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: decoded.userId,
        type: 'WALLET_FUNDING',
        amount,
        status: 'COMPLETED', // Auto-complete for testing
        reference: transactionRef,
        details: {
          paymentMethod: 'test',
          channel: 'test',
          fundingType: 'test_wallet_topup',
          completedAt: new Date().toISOString(),
        },
      },
    });

    // Update user wallet balance immediately
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        credits: {
          increment: amount,
        },
      },
    });

    console.log(`Test wallet funding completed for user ${decoded.userId}: ₦${amount}`);

    return NextResponse.json({
      reference: transactionRef,
      amount,
      status: 'completed',
      message: 'Test funding completed successfully',
    });

  } catch (error) {
    console.error('Test wallet funding error:', error);
    return NextResponse.json(
      { error: 'Failed to process test funding' },
      { status: 500 }
    );
  }
}