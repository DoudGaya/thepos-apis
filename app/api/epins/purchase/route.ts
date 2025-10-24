import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import VTUProvider from '@/lib/services/vtu';

const epinsPurchaseSchema = z.object({
  network: z.enum(['mtn', 'airtel', 'glo', '9mobile']),
  value: z.number().refine((val) => [100, 200, 500].includes(val), {
    message: 'Value must be 100, 200, or 500'
  }),
  quantity: z.number().min(1, 'Minimum quantity is 1').max(40, 'Maximum quantity is 40'),
});

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { network, value, quantity } = epinsPurchaseSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate total cost and pricing (2% markup on ePINs)
    const totalValue = value * quantity;
    const customerAmount = Math.ceil(totalValue * 1.02);

    // Check wallet balance
    if (user.credits < customerAmount) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance', required: customerAmount, available: user.credits },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `EPINS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'CREDIT_PURCHASE', // Using CREDIT_PURCHASE as placeholder for ePINs
        status: 'PENDING',
        amount: customerAmount,
        reference,
        details: {
          network,
          value,
          quantity,
          totalValue,
          description: `${network.toUpperCase()} ePINs - ${quantity}x ₦${value}`,
          vtuProvider: 'VTU.NG',
        },
      },
    });

    try {
      // Initialize VTU provider
      const vtuProvider = new VTUProvider();

      // Purchase ePINs via VTU.NG
      const purchaseResult = await vtuProvider.purchaseEpins(
        network,
        value as 100 | 200 | 500,
        quantity,
        reference
      );

      if (purchaseResult.success) {
        // Deduct from wallet
        const newBalance = user.credits - customerAmount;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            credits: newBalance,
          },
        });

        // TODO: Handle referral commission - Requires schema updates
        // See VTU_SETUP_STATUS.md for implementation options

        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            details: {
              network,
              value,
              quantity,
              totalValue,
              chargedAmount: customerAmount,
              description: `${network.toUpperCase()} ePINs - ${quantity}x ₦${value}`,
              vtuProvider: 'VTU.NG',
              vtuOrderId: purchaseResult.transactionId,
              vtuReference: purchaseResult.reference,
              epins: purchaseResult.epins,
              providerResponse: purchaseResult.metadata,
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: 'ePINs purchase successful',
          data: {
            transactionId: transaction.id,
            reference: transaction.reference,
            amount: customerAmount,
            network,
            value,
            quantity,
            epins: purchaseResult.epins,
            balance: newBalance,
            status: 'completed',
          },
        });
      } else {
        // Purchase failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            details: {
              network,
              value,
              quantity,
              totalValue,
              error: purchaseResult.message,
              providerResponse: purchaseResult.metadata,
            },
          },
        });

        return NextResponse.json(
          { 
            error: 'ePINs purchase failed', 
            message: purchaseResult.message,
            reference: transaction.reference,
          },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('ePINs purchase error:', error);

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          details: {
            network,
            value,
            quantity,
            totalValue,
            error: error.message || 'Unknown error',
          },
        },
      });

      return NextResponse.json(
        { 
          error: 'ePINs purchase failed', 
          message: error.message || 'An error occurred',
          reference: transaction.reference,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('ePINs API error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
