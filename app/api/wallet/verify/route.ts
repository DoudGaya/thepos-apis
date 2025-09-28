import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import paystackService from '../../../../lib/paystack';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get user ID from middleware-set headers
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        reference,
        userId,
        type: 'WALLET_FUNDING'
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        status: 'completed',
        amount: transaction.amount
      });
    }

    if (transaction.status === 'FAILED') {
      return NextResponse.json({
        success: false,
        message: 'Payment failed',
        status: 'failed'
      });
    }

    // Verify with Paystack
    try {
      const verification = await paystackService.verifyTransaction(reference);

      if (verification.data.status === 'success') {
        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            details: {
              ...(transaction.details as object || {}),
              paystackData: verification.data,
              verifiedAt: new Date().toISOString(),
            }
          },
        });

        // Update user wallet balance
        const amountInNaira = verification.data.amount / 100;
        await prisma.user.update({
          where: { id: transaction.userId },
          data: {
            credits: {
              increment: amountInNaira,
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Payment verified successfully',
          status: 'completed',
          amount: amountInNaira
        });
      } else {
        // Update transaction as failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            details: {
              ...(transaction.details as object || {}),
              verificationError: 'Payment not successful',
              paystackData: verification.data,
            }
          },
        });

        return NextResponse.json({
          success: false,
          message: 'Payment verification failed',
          status: 'failed'
        });
      }
    } catch (verifyError: any) {
      console.error('Verification error:', verifyError);
      return NextResponse.json({
        success: false,
        message: 'Unable to verify payment at this time',
        status: 'pending'
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}