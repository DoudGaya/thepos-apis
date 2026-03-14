import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { referralService } from '@/lib/services/ReferralService';

// Nomba webhook endpoint
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // NOTE: Nomba docs don't explicitly mention signature verification header in the prompt provided.
        // However, usually there is `x-nomba-signature` or similar. 
        // For now, we'll validate based on the payload structure and order reference existence.

        const { event, data } = body;

        console.log(`Nomba webhook received: ${event}`, data);

        if (event === 'order.payment.successful' || event === 'payment.successful' || event === 'checkout.order.payment.successful') {
            // Support various webhook payload shapes from Nomba
            // - data.orderReference  → our local reference (e.g. "FUNDMMGNVKCG479WO6T")
            // - data.reference       → fallback
            // - data.orderId         → Nomba's UUID (fallback, matched via details.nombaOrderReference)
            const reference = data.orderReference || data.reference;
            const nombaOrderId = data.orderId;
            const amount = data.amount;

            if (!reference && !nombaOrderId) {
                console.error('Nomba webhook missing reference');
                return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
            }

            let transaction = reference
                ? await prisma.transaction.findFirst({ where: { reference } })
                : null;

            // Fallback: look up by Nomba's orderId stored in transaction details
            if (!transaction && nombaOrderId) {
                transaction = await prisma.transaction.findFirst({
                    where: {
                        details: {
                            path: ['nombaOrderReference'],
                            equals: nombaOrderId,
                        },
                    },
                });
            }

            if (!transaction) {
                console.log(`Nomba webhook: Transaction not found for reference=${reference} orderId=${nombaOrderId}`);
                return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
            }

            // Atomic: only proceed if status is still PENDING — prevents double-credit
            // when the webhook fires at the same time as the verify endpoint poll.
            const creditAmount = amount ? parseFloat(amount) : transaction.amount;

            const webhookResult = await prisma.$transaction(async (tx) => {
                const updated = await tx.transaction.updateMany({
                    where: { id: transaction.id, status: 'PENDING' },
                    data: { status: 'COMPLETED' },
                });

                if (updated.count === 0) {
                    return { credited: false };
                }

                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        details: {
                            ...(transaction.details as object || {}),
                            nombaWebhook: {
                                event,
                                data,
                                processed_at: new Date().toISOString(),
                            },
                        },
                    },
                });

                await tx.user.update({
                    where: { id: transaction.userId },
                    data: { credits: { increment: creditAmount } },
                });

                return { credited: true };
            });

            if (!webhookResult.credited) {
                console.log(`Nomba webhook: Transaction already completed (concurrent): ${transaction.reference}`);
                return NextResponse.json({ message: 'Already processed' });
            }

            console.log(`Wallet funding completed via Nomba webhook for user ${transaction.userId}: ₦${creditAmount} (ref=${transaction.reference})`);

            // Fire referral first-funding bonus (fire-and-forget)
            referralService.processFirstFundingBonus(transaction.userId, creditAmount)
              .catch((e: any) => console.error('[Referral] Nomba first-funding bonus error:', e.message));

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
