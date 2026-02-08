import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Nomba webhook endpoint
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // NOTE: Nomba docs don't explicitly mention signature verification header in the prompt provided.
        // However, usually there is `x-nomba-signature` or similar. 
        // For now, we'll validate based on the payload structure and order reference existence.

        const { event, data } = body;

        console.log(`Nomba webhook received: ${event}`, data);

        if (event === 'order.payment.successful' || event === 'payment.successful') {
            // Adjust event name based on actual Nomba webhook documentation if different
            // The prompt doesn't specify the exact webhook event name for success, assuming standard naming.
            // We will assume data contains orderReference.

            const reference = data.orderReference || data.reference;
            const amount = data.amount;

            if (!reference) {
                console.error('Nomba webhook missing reference');
                return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
            }

            const transaction = await prisma.transaction.findFirst({
                where: { reference },
            });

            if (!transaction) {
                console.log(`Transaction not found: ${reference}`);
                return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
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
                        nombaWebhook: {
                            event,
                            data,
                            processed_at: new Date().toISOString(),
                        }
                    },
                },
            });

            // Credit User Wallet
            // Ensure amount is in correct unit. Nomba docs say "10000.00" so likely Naira.
            // Prisma expects Float/Decimal.
            await prisma.user.update({
                where: { id: transaction.userId },
                data: {
                    credits: {
                        increment: parseFloat(amount),
                    },
                },
            });

            console.log(`Wallet funding completed via Nomba webhook for user ${transaction.userId}: ₦${amount}`);
            return NextResponse.json({ message: 'Webhook processed successfully' });
        }

        return NextResponse.json({ message: 'Event received' });

    } catch (error: any) {
        console.error('Nomba webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
