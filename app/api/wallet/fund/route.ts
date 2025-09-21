import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Fund wallet
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const body = await request.json();

    const { amount, paymentMethod = 'card', reference, channel } = body;

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

    // Generate unique reference if not provided
    const transactionRef = reference || `FUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: decoded.userId,
        type: 'WALLET_FUNDING',
        amount,
        status: 'PENDING',
        reference: transactionRef,
        details: {
          paymentMethod,
          channel: channel || 'mobile',
          fundingType: 'wallet_topup',
        },
      },
    });

    // Simulate payment processing based on method
    let response: any = {
      reference: transactionRef,
      amount,
      status: 'pending',
    };

    switch (paymentMethod) {
      case 'card':
        // For demo, simulate Paystack integration
        response.paymentUrl = `https://checkout.paystack.com/pay/${transactionRef}`;
        break;
      
      case 'bank':
      case 'bank_transfer':
        // For demo, provide bank details
        response.bankDetails = {
          accountName: 'ThePOS Technology',
          accountNumber: '1234567890',
          bankName: 'GTBank',
          reference: transactionRef,
        };
        break;
      
      case 'ussd':
        // For demo, provide USSD code
        response.ussdCode = `*737*000*${amount}*${transactionRef}#`;
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
    }

    // For demo purposes, auto-complete the transaction after 5 seconds
    // In production, this would be handled by payment webhook
    setTimeout(async () => {
      try {
        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'COMPLETED' },
        });

        // Update user balance
        await prisma.user.update({
          where: { id: decoded.userId },
          data: {
            credits: {
              increment: amount,
            },
          },
        });

        console.log(`Wallet funding completed for user ${decoded.userId}: ₦${amount}`);
      } catch (error) {
        console.error('Auto-complete funding error:', error);
      }
    }, 5000);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Wallet funding error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate wallet funding' },
      { status: 500 }
    );
  }
}
