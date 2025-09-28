import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// Simulate successful payment (for testing only)
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify token using auth module
    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const { reference, amount } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: { 
        reference,
        userId: userId,
        status: 'PENDING'
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Pending transaction not found' }, { status: 404 });
    }

    // Mark transaction as completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: {
          ...(transaction.details as object || {}),
          simulatedPayment: true,
          completedAt: new Date().toISOString(),
        }
      },
    });

    // Update user wallet balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: transaction.amount,
        },
      },
    });

    console.log(`Simulated payment completed for user ${userId}: ₦${transaction.amount}`);

    return NextResponse.json({
      success: true,
      message: 'Payment simulation completed',
      reference: transaction.reference,
      amount: transaction.amount,
      newBalance: await getUserBalance(userId),
    });

  } catch (error: any) {
    console.error('Payment simulation error:', error);
    return NextResponse.json(
      { error: 'Failed to simulate payment', details: error.message }, 
      { status: 500 }
    );
  }
}

async function getUserBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true }
  });
  return user?.credits || 0;
}