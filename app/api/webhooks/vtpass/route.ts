import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * VTpass Webhook Handler
 * 
 * VTpass sends POST requests to this endpoint when a transaction status changes.
 * 
 * Payloads:
 * {
 *   "request_id": "202601121701a9bx2y1x",
 *   "code": "000",
 *   "response_description": "TRANSACTION SUCCESSFUL",
 *   "amount": "50.00",
 *   "transaction_date": "2026-01-12 17:01:55",
 *   "status": "delivered",
 *   "purchased_code": ""
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        const { request_id, status, code, response_description, amount, purchased_code } = payload;

        console.log('[VTPass Webhook] Received:', { request_id, status, code });

        if (!request_id) {
            return NextResponse.json({ message: 'Missing request_id' }, { status: 400 });
        }

        // Find transaction by vendor reference (request_id)
        const transaction = await prisma.transaction.findUnique({
            where: { reference: request_id },
            include: { user: true }
        });

        if (!transaction) {
            console.warn('[VTPass Webhook] Transaction not found:', request_id);
            // Return 200 to VTpass to stop retries
            return NextResponse.json({ status: 'success', message: 'Transaction not found' });
        }

        // If already in a terminal state, don't re-process
        if (transaction.status === 'COMPLETED' || transaction.status === 'FAILED' || transaction.status === 'CANCELLED') {
            console.log('[VTPass Webhook] Transaction already in terminal state:', transaction.status);
            return NextResponse.json({ status: 'success', message: 'Already processed' });
        }

        // Handle delivered status
        if (status === 'delivered' || code === '000') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETED',
                    details: {
                        ...(transaction.details as object || {}),
                        webhookReceived: true,
                        webhookTimestamp: new Date().toISOString(),
                        purchased_code: purchased_code || (transaction.details as any)?.purchased_code,
                        vtpassResponse: payload
                    }
                }
            });
            console.log('[VTPass Webhook] Transaction marked as COMPLETED:', transaction.id);
        }
        // Handle failed or reversed status
        else if (status === 'failed' || status === 'reversed') {
            const isReversed = status === 'reversed';

            // Update transaction status
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    details: {
                        ...(transaction.details as object || {}),
                        webhookReceived: true,
                        webhookTimestamp: new Date().toISOString(),
                        failureReason: response_description || status,
                        isReversed,
                        vtpassResponse: payload
                    }
                }
            });

            // Refund user if it was a debit transaction and not already failed
            if (transaction.amount > 0) {
                await prisma.user.update({
                    where: { id: transaction.userId },
                    data: {
                        credits: { increment: transaction.amount }
                    }
                });
                console.log(`[VTPass Webhook] Refunded ${transaction.amount} back to user ${transaction.userId}`);
            }

            console.log(`[VTPass Webhook] Transaction marked as FAILED (Reversed: ${isReversed}):`, transaction.id);
        }

        return NextResponse.json({ status: 'success' });
    } catch (error: any) {
        console.error('[VTPass Webhook] Error:', error.message);
        // VTpass retries if they don't get a 200, so we return 200 even on error unless it's critical
        return NextResponse.json({ status: 'error', message: error.message }, { status: 200 });
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'active',
        vendor: 'VTPASS',
        callback_url: 'https://your-domain.com/api/webhooks/vtpass'
    });
}
