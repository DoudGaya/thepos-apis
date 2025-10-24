import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import VTUProvider from '@/lib/services/vtu';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 403 }
      );
    }

    // Initialize VTU provider
    const vtuProvider = new VTUProvider();

    // Verify webhook signature
    const isValid = vtuProvider.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const {
      order_id,
      status,
      product_name,
      quantity,
      amount,
      amount_charged,
      request_id,
      meta_data,
      epins,
    } = payload;

    console.log('VTU Webhook received:', {
      order_id,
      status,
      request_id,
      product_name,
    });

    // Find transaction by reference (request_id)
    const transaction = await prisma.transaction.findFirst({
      where: {
        reference: request_id,
      },
      include: {
        user: true,
      },
    });

    if (!transaction) {
      console.error('Transaction not found for reference:', request_id);
      return NextResponse.json(
        { status: 'success', message: 'Transaction not found' },
        { status: 200 }
      );
    }

    // Handle completed order
    if (status === 'completed-api') {
      // Check if transaction is already completed
      if (transaction.status === 'COMPLETED') {
        console.log('Transaction already completed:', transaction.id);
        return NextResponse.json(
          { status: 'success', message: 'Already processed' },
          { status: 200 }
        );
      }

      // Update transaction to completed
      const updatedDetails = {
        ...(transaction.details as object || {}),
        vtuOrderId: order_id,
        vtuStatus: status,
        webhookReceived: true,
        webhookTimestamp: new Date().toISOString(),
        meta_data,
        epins,
      };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          details: updatedDetails,
        },
      });

      console.log('Transaction completed via webhook:', transaction.id);

      return NextResponse.json(
        { status: 'success', message: 'Webhook processed' },
        { status: 200 }
      );
    }

    // Handle refunded order
    if (status === 'refunded') {
      // Check if transaction is already failed/cancelled
      if (transaction.status === 'FAILED' || transaction.status === 'CANCELLED') {
        console.log('Transaction already marked as failed:', transaction.id);
        return NextResponse.json(
          { status: 'success', message: 'Already processed' },
          { status: 200 }
        );
      }

      // Refund the amount to user's wallet
      await prisma.user.update({
        where: { id: transaction.userId },
        data: {
          credits: { increment: transaction.amount },
        },
      });

      // If there was a referral commission, reverse it
      const referralEarning = await prisma.referralEarning.findFirst({
        where: {
          transactionId: transaction.id,
        },
      });

      if (referralEarning && referralEarning.status === 'PENDING') {
        // Just mark the earning as cancelled, don't deduct since it was pending
        await prisma.referralEarning.update({
          where: { id: referralEarning.id },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      // Update transaction to failed
      const updatedDetails = {
        ...(transaction.details as object || {}),
        vtuOrderId: order_id,
        vtuStatus: status,
        refundReason: 'Order refunded by VTU.NG',
        webhookReceived: true,
        webhookTimestamp: new Date().toISOString(),
        meta_data,
      };

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          details: updatedDetails,
        },
      });

      console.log('Transaction refunded via webhook:', transaction.id);

      return NextResponse.json(
        { status: 'success', message: 'Webhook processed' },
        { status: 200 }
      );
    }

    // Handle other statuses (processing, pending, etc.)
    console.log('Webhook received for status:', status);

    return NextResponse.json(
      { status: 'success', message: 'Webhook received' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // Return 200 to acknowledge receipt even on error
    // This prevents VTU.NG from retrying unnecessarily
    return NextResponse.json(
      { status: 'error', message: 'Processing error' },
      { status: 200 }
    );
  }
}

// GET endpoint to verify webhook is accessible
export async function GET() {
  return NextResponse.json(
    { 
      message: 'VTU.NG Webhook Endpoint',
      status: 'active',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
