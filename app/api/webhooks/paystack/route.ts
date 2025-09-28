import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Paystack webhook endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.log('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    
    // Handle successful charge
    if (event.event === 'charge.success') {
      const { reference, amount, status, paid_at, metadata } = event.data;
      
      console.log(`Paystack webhook: ${event.event} - ${reference} - ₦${amount/100}`);

      // Find the transaction
      const transaction = await prisma.transaction.findFirst({
        where: { reference },
      });

      if (!transaction) {
        console.log(`Transaction not found: ${reference}`);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      if (transaction.status === 'COMPLETED') {
        console.log(`Transaction already completed: ${reference}`);
        return NextResponse.json({ message: 'Already processed' });
      }

      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          details: {
            ...(transaction.details as object || {}),
            paystackWebhook: {
              event: event.event,
              amount,
              status,
              paid_at,
              metadata,
              processed_at: new Date().toISOString(),
            }
          },
        },
      });

      // Update user wallet balance
      const amountInNaira = amount / 100; // Convert from kobo to naira
      await prisma.user.update({
        where: { id: transaction.userId },
        data: {
          credits: {
            increment: amountInNaira,
          },
        },
      });

      console.log(`Wallet funding completed via webhook for user ${transaction.userId}: ₦${amountInNaira}`);

      return NextResponse.json({ 
        message: 'Webhook processed successfully',
        reference,
        amount: amountInNaira
      });
    }

    // Handle failed charge
    if (event.event === 'charge.failed') {
      const { reference } = event.data;
      
      console.log(`Paystack webhook: ${event.event} - ${reference}`);

      // Update transaction status to failed
      await prisma.transaction.updateMany({
        where: { reference },
        data: {
          status: 'FAILED',
          details: {
            paystackWebhook: {
              event: event.event,
              data: event.data,
              processed_at: new Date().toISOString(),
            }
          },
        },
      });

      return NextResponse.json({ message: 'Failed transaction recorded' });
    }

    // Other events
    console.log(`Unhandled Paystack webhook event: ${event.event}`);
    return NextResponse.json({ message: 'Event received' });

  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}