/**
 * OPay Webhook Handler
 * POST /api/webhooks/opay
 * Handles payment notifications from OPay
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import opayService from '@/lib/services/OpayService';

export async function POST(request: NextRequest) {
    console.log('🔔 [OPay Webhook] Received callback');

    try {
        const body = await request.text();
        const signature = request.headers.get('opay-signature') || '';

        // Validate webhook signature
        const isValid = opayService.validateWebhookSignature(signature, body);

        if (!isValid) {
            console.error('❌ [OPay Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(body);
        console.log('✅ [OPay Webhook] Valid signature, payload:', {
            reference: payload.reference,
            status: payload.status,
            orderNo: payload.orderNo,
        });

        const { reference, status, orderNo, amount } = payload;

        // Find the transaction
        const transaction = await prisma.transaction.findFirst({
            where: {
                reference,
                type: 'WALLET_FUNDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!transaction) {
            console.error('❌ [OPay Webhook] Transaction not found:', reference);
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Check if already processed
        if (transaction.status === 'SUCCESS') {
            console.log('⚠️ [OPay Webhook] Transaction already processed:', reference);
            return NextResponse.json({ message: 'Already processed' }, { status: 200 });
        }

        // Handle payment status
        if (status === 'SUCCESS') {
            console.log('💰 [OPay Webhook] Payment successful, crediting wallet');

            // Verify amount matches (OPay sends in kobo)
            const amountInNaira = amount.total / 100;

            if (amountInNaira !== transaction.amount) {
                console.error('❌ [OPay Webhook] Amount mismatch:', {
                    expected: transaction.amount,
                    received: amountInNaira,
                });

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'FAILED',
                        details: {
                            ...(transaction.details as Record<string, any> || {}),
                            error: 'Amount mismatch',
                            expectedAmount: transaction.amount,
                            receivedAmount: amountInNaira,
                        },
                    },
                });

                return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
            }

            // Update transaction and credit wallet
            await prisma.$transaction(async (tx) => {
                // Update transaction status
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'SUCCESS',
                        details: {
                            ...(transaction.details as Record<string, any> || {}),
                            opayData: {
                                orderNo,
                                status,
                                amount,
                                verifiedAt: new Date().toISOString(),
                            },
                        },
                    },
                });

                // Credit user wallet
                await tx.user.update({
                    where: { id: transaction.userId },
                    data: {
                        credits: {
                            increment: amountInNaira,
                        },
                    },
                });

                // Create success notification
                await tx.notification.create({
                    data: {
                        userId: transaction.userId,
                        title: 'Wallet Funded Successfully',
                        message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()} via OPay`,
                        type: 'TRANSACTION',
                    },
                });
            });

            console.log('✅ [OPay Webhook] Wallet credited successfully:', {
                userId: transaction.userId,
                amount: amountInNaira,
            });

            return NextResponse.json({
                success: true,
                message: 'Payment processed successfully',
            });
        } else if (status === 'FAIL') {
            console.log('❌ [OPay Webhook] Payment failed');

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    details: {
                        ...(transaction.details as Record<string, any> || {}),
                        opayData: {
                            orderNo,
                            status,
                            failedAt: new Date().toISOString(),
                        },
                    },
                },
            });

            // Create failure notification
            await prisma.notification.create({
                data: {
                    userId: transaction.userId,
                    title: 'Wallet Funding Failed',
                    message: 'Your wallet funding attempt via OPay was not successful. Please try again.',
                    type: 'TRANSACTION',
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Payment failure recorded',
            });
        } else {
            // PENDING or other status
            console.log('⏳ [OPay Webhook] Payment status:', status);

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    details: {
                        ...(transaction.details as Record<string, any> || {}),
                        opayData: {
                            orderNo,
                            status,
                            updatedAt: new Date().toISOString(),
                        },
                    },
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Payment status updated',
            });
        }
    } catch (error: any) {
        console.error('❌ [OPay Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed', details: error.message },
            { status: 500 }
        );
    }
}

// Disable body parsing for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};
