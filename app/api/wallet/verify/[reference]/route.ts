import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import paystackService from '../../../../../lib/paystack';

const prisma = new PrismaClient();

// Verify payment by reference
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    // Get user ID from middleware-set headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reference } = await params;

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: { 
        reference,
        userId: userId,
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // If already completed, return the status
    if (transaction.status === 'COMPLETED') {
      return NextResponse.json({
        reference: transaction.reference,
        status: 'success',
        amount: transaction.amount,
        fee: 0,
        currency: 'NGN',
        gateway: 'paystack',
        transactionDate: transaction.createdAt.toISOString(),
      });
    }

    // If failed, return failed status
    if (transaction.status === 'FAILED') {
      return NextResponse.json({
        reference: transaction.reference,
        status: 'failed',
        amount: transaction.amount,
        fee: 0,
        currency: 'NGN',
        gateway: 'paystack',
        transactionDate: transaction.createdAt.toISOString(),
      });
    }

    // If pending, verify with Paystack
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
              manualVerificationAt: new Date().toISOString(),
            }
          },
        });

        // Update user wallet balance
        const amountInNaira = verification.data.amount / 100; // Convert from kobo to naira
        await prisma.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: amountInNaira,
            },
          },
        });

        console.log(`Manual verification completed for user ${userId}: ₦${amountInNaira}`);

        return NextResponse.json({
          reference: verification.data.reference,
          status: 'success',
          amount: amountInNaira,
          fee: verification.data.fees || 0,
          currency: verification.data.currency,
          gateway: verification.data.channel,
          transactionDate: verification.data.paid_at,
        });
      } else {
        // Update transaction as failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            details: {
              ...(transaction.details as object || {}),
              verificationError: 'Payment verification failed',
              paystackData: verification.data,
            }
          },
        });

        return NextResponse.json({
          reference: verification.data.reference,
          status: 'failed',
          amount: transaction.amount,
          fee: 0,
          currency: 'NGN',
          gateway: 'paystack',
          transactionDate: transaction.createdAt.toISOString(),
        });
      }
    } catch (verifyError: any) {
      console.error('Payment verification error:', verifyError);
      return NextResponse.json({
        reference: transaction.reference,
        status: 'pending',
        amount: transaction.amount,
        fee: 0,
        currency: 'NGN',
        gateway: 'paystack',
        transactionDate: transaction.createdAt.toISOString(),
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}