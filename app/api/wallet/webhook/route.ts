import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import paystackService from '../../../../lib/paystack';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex');

    const signature = request.headers.get('x-paystack-signature');

    if (hash !== signature) {
      console.log('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const { reference, amount, status, customer, metadata } = event.data;

      console.log('Processing successful payment:', { reference, amount, status });

      // Find the transaction
      const transaction = await prisma.transaction.findFirst({
        where: { reference }
      });

      if (!transaction) {
        console.log('Transaction not found for reference:', reference);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      if (transaction.status === 'COMPLETED') {
        console.log('Transaction already completed:', reference);
        return NextResponse.json({ message: 'Already processed' }, { status: 200 });
      }

      // Verify with Paystack to ensure authenticity
      try {
        const verification = await paystackService.verifyTransaction(reference);
        
        if (verification.data.status === 'success' && verification.data.amount === amount) {
          // Update transaction status
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'COMPLETED',
              details: {
                ...(transaction.details as object || {}),
                paystackData: verification.data,
                webhookProcessedAt: new Date().toISOString(),
              }
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

          return NextResponse.json({ message: 'Payment processed successfully' }, { status: 200 });
        } else {
          console.log('Payment verification failed:', verification.data);
          
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

          return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
        }
      } catch (verifyError) {
        console.error('Error verifying payment:', verifyError);
        return NextResponse.json({ error: 'Verification error' }, { status: 500 });
      }
    }

    // Handle failed payments
    if (event.event === 'charge.failed') {
      const { reference } = event.data;
      
      const transaction = await prisma.transaction.findFirst({
        where: { reference }
      });

      if (transaction) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            details: {
              ...(transaction.details as object || {}),
              failureReason: event.data.gateway_response || 'Payment failed',
              webhookProcessedAt: new Date().toISOString(),
            }
          },
        });

        console.log(`Payment failed for reference ${reference}: ${event.data.gateway_response}`);
      }

      return NextResponse.json({ message: 'Payment failure processed' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Event not handled' }, { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}