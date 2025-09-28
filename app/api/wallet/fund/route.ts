import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import paystackService from '../../../../lib/paystack';

const prisma = new PrismaClient();

// Fund wallet
export async function POST(request: NextRequest) {
  try {
    // Get user ID from middleware-set headers
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    const { amount, paymentMethod = 'card' } = body;

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

    if (amount > 1000000) {
      return NextResponse.json(
        { error: 'Maximum funding amount is ₦1,000,000' },
        { status: 400 }
      );
    }

    // Get user details for Paystack
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate unique reference
    const transactionRef = `FUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        type: 'WALLET_FUNDING',
        amount,
        status: 'PENDING',
        reference: transactionRef,
        details: {
          paymentMethod,
          channel: 'mobile',
          fundingType: 'wallet_topup',
        },
      },
    });

    try {
      // Initialize Paystack transaction with all payment channels
      const paystackResponse = await paystackService.initializeTransaction({
        amount: amount * 100, // Convert to kobo
        email: user.email,
        reference: transactionRef,
        callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/wallet/verify?reference=${transactionRef}`,
        metadata: {
          user_id: userId,
          purpose: 'wallet_funding',
          payment_method: paymentMethod,
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      });

      if (!paystackResponse.status) {
        throw new Error(paystackResponse.message || 'Failed to initialize payment');
      }

      // Update transaction with Paystack reference
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          details: {
            ...(transaction.details as object || {}),
            paystackReference: paystackResponse.data.reference,
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          authorization_url: paystackResponse.data.authorization_url,
          reference: transactionRef,
          access_code: paystackResponse.data.access_code,
          payment_channels: ['card', 'bank_transfer', 'ussd', 'qr', 'mobile_money']
        }
      });

    } catch (paymentError: any) {
      console.error('Payment initialization error:', paymentError);

      // Update transaction status to failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          details: {
            ...(transaction.details as object || {}),
            error: paymentError.message,
          }
        },
      });

      return NextResponse.json(
        { error: paymentError.message || 'Failed to initialize payment' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Wallet funding error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate wallet funding' },
      { status: 500 }
    );
  }
}
