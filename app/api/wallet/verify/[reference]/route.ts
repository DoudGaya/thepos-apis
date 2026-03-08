import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import paystackService from '../../../../../lib/paystack';
import nombaService from '../../../../../lib/nomba';

// Verify payment by reference
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    // Get user ID from middleware-set headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { reference } = await params;

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: { 
        reference,
        userId: userId,
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // If already completed, return the status
    if (transaction.status === 'COMPLETED') {
      const details = transaction.details as any;
      const gateway = details?.provider || details?.gateway || 'unknown';
      return NextResponse.json({
        reference: transaction.reference,
        status: 'success',
        amount: transaction.amount,
        fee: 0,
        currency: 'NGN',
        gateway,
        transactionDate: transaction.createdAt.toISOString(),
      });
    }

    // If failed, return failed status
    if (transaction.status === 'FAILED') {
      const details = transaction.details as any;
      const gateway = details?.provider || details?.gateway || 'unknown';
      return NextResponse.json({
        reference: transaction.reference,
        status: 'failed',
        amount: transaction.amount,
        fee: 0,
        currency: 'NGN',
        gateway,
        transactionDate: transaction.createdAt.toISOString(),
      });
    }

    // --- Determine provider ---
    // The fund route stores details.paymentMethod ('nomba' | 'paystack' | 'opay')
    const details = transaction.details as any;
    const paymentMethod: string = details?.paymentMethod || details?.provider || details?.gateway || 'paystack';
    const isNomba = paymentMethod === 'nomba';

    // --- Nomba verification path ---
    if (isNomba) {
      // Hoist ref so it is accessible in both the try and catch blocks
      const nombaOrderRef: string = details?.nombaOrderReference || reference;
      try {
        // 1. Re-fetch the transaction from DB first — the Nomba webhook may have
        //    already marked it COMPLETED while the user was in their bank app.
        const freshTransaction = await prisma.transaction.findUnique({
          where: { id: transaction.id },
        });

        if (freshTransaction?.status === 'COMPLETED') {
          return NextResponse.json({
            reference,
            status: 'success',
            amount: freshTransaction.amount,
            fee: 0,
            currency: 'NGN',
            gateway: 'nomba',
            transactionDate: freshTransaction.updatedAt?.toISOString() || freshTransaction.createdAt.toISOString(),
          });
        }

        if (freshTransaction?.status === 'FAILED') {
          return NextResponse.json({
            reference,
            status: 'failed',
            amount: freshTransaction.amount,
            fee: 0,
            currency: 'NGN',
            gateway: 'nomba',
            transactionDate: freshTransaction.createdAt.toISOString(),
          });
        }

        // 2. Still PENDING — query Nomba's order endpoint.
        //    NOTE: GET /v1/checkout/order/{ref} returns ORDER METADATA only (not payment status).
        //    The response shape is: { code: "00", data: { order: { ... } } }
        //    There is no "status" field — actual confirmation comes via webhook.
        const nombaResponse = await nombaService.verifyOrder(nombaOrderRef);

        // Safely dig into the nested structure
        const orderInfo = nombaResponse?.data?.order || nombaResponse?.data || {};

        // Nomba's order endpoint (GET /v1/checkout/order/{ref}) returns ORDER METADATA.
        // It generally does not return payment status (only exception is if they add it later).
        // Let's purely rely on the 'already completed' 400 error below or webhook,
        // because extracting generic "status: 'SUCCESS'" can falsely trigger on 'Request Success'.
        
        const rawStatus: string = (
          orderInfo?.paymentStatus || 
          orderInfo?.orderStatus || 
          ''
        ).toUpperCase();

        // STRICT MATCH: Only consider paid if it explicitly says PAID or COMPLETED on the *payment*
        const isPaid = ['PAID', 'COMPLETED'].includes(rawStatus);
        const isFailed = ['FAILED', 'EXPIRED', 'CANCELLED'].includes(rawStatus);

        if (isPaid) {
          const amountInNaira = orderInfo?.amount ? parseFloat(orderInfo.amount) : transaction.amount;

          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'COMPLETED',
              details: {
                ...(details || {}),
                provider: 'nomba',
                nombaOrderData: orderInfo,
                manualVerificationAt: new Date().toISOString(),
              },
            },
          });

          await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: amountInNaira } },
          });

          console.log(`[Nomba] Manual verification completed for user ${userId}: ₦${amountInNaira}`);

          return NextResponse.json({
            reference,
            status: 'success',
            amount: amountInNaira,
            fee: 0,
            currency: 'NGN',
            gateway: 'nomba',
            transactionDate: transaction.createdAt.toISOString(),
          });
        } else if (isFailed) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'FAILED',
              details: {
                ...(details || {}),
                provider: 'nomba',
                nombaOrderData: orderInfo,
              },
            },
          });

          return NextResponse.json({
            reference,
            status: 'failed',
            amount: transaction.amount,
            fee: 0,
            currency: 'NGN',
            gateway: 'nomba',
            transactionDate: transaction.createdAt.toISOString(),
          });
        } else {
          // Nomba's order endpoint does not return payment status — still pending.
          // The webhook will mark COMPLETED when payment succeeds.
          console.log(`[Nomba] Order ${nombaOrderRef} still PENDING (webhook not yet received)`);
          return NextResponse.json({
            reference,
            status: 'pending',
            amount: transaction.amount,
            fee: 0,
            currency: 'NGN',
            gateway: 'nomba',
            transactionDate: transaction.createdAt.toISOString(),
          });
        }

      } catch (nombaError: any) {
        console.error('[Nomba] Verification error:', nombaError.message);

        // Nomba returns HTTP 400 with description "this transaction is already completed"
        // when the order has been paid. This is a success signal, not a true error.
        const errorBody = nombaError?.response?.data || {};
        const errorDesc: string = (errorBody?.description || nombaError.message || '').toLowerCase();
        const isAlreadyCompleted =
          errorDesc.includes('already completed') ||
          errorDesc.includes('transaction is already') ||
          errorDesc.includes('already processed');

        if (isAlreadyCompleted) {
          console.log(`[Nomba] "already completed" signal received for ${nombaOrderRef} — checking DB`);

          // Re-fetch the transaction to get the latest status (webhook may have fired)
          const latestTx = await prisma.transaction.findUnique({ where: { id: transaction.id } });

          if (latestTx?.status === 'COMPLETED') {
            // Webhook already handled it — just return success
            return NextResponse.json({
              reference,
              status: 'success',
              amount: latestTx.amount,
              fee: 0,
              currency: 'NGN',
              gateway: 'nomba',
              transactionDate: latestTx.updatedAt?.toISOString() || latestTx.createdAt.toISOString(),
            });
          }

          // Webhook was missed/delayed — Nomba confirmed payment, so complete it here.
          // Use an atomic updateMany(where status=PENDING) to prevent double-crediting
          // when multiple concurrent polling requests race to this point.
          console.log(`[Nomba] Webhook not yet received — completing transaction ${reference} via verify endpoint`);
          const amountToCredit = transaction.amount;

          const atomicResult = await prisma.$transaction(async (tx) => {
            // Only updates if status is still PENDING — acts as a compare-and-swap
            const updated = await tx.transaction.updateMany({
              where: { id: transaction.id, status: 'PENDING' },
              data: { status: 'COMPLETED' },
            });

            if (updated.count === 0) {
              // Another concurrent request already completed it — we lost the race
              return { credited: false };
            }

            // We won the race — update details and credit wallet atomically
            await tx.transaction.update({
              where: { id: transaction.id },
              data: {
                details: {
                  ...(details || {}),
                  provider: 'nomba',
                  completedVia: 'verify-endpoint-already-completed',
                  completedAt: new Date().toISOString(),
                },
              },
            });

            await tx.user.update({
              where: { id: userId },
              data: { credits: { increment: amountToCredit } },
            });

            return { credited: true };
          });

          if (atomicResult.credited) {
            console.log(`[Nomba] Wallet credited ₦${amountToCredit} for user ${userId} via verify endpoint`);
          } else {
            console.log(`[Nomba] Concurrent request already credited transaction ${reference} — skipping duplicate`);
          }

          return NextResponse.json({
            reference,
            status: 'success',
            amount: amountToCredit,
            fee: 0,
            currency: 'NGN',
            gateway: 'nomba',
            transactionDate: new Date().toISOString(),
          });
        }

        // Genuine unknown error — return pending so the client can retry
        return NextResponse.json({
          reference,
          status: 'pending',
          amount: transaction.amount,
          fee: 0,
          currency: 'NGN',
          gateway: 'nomba',
          transactionDate: transaction.createdAt.toISOString(),
        });
      }
    }

    // --- Paystack verification path (default) ---
    try {
      const verification = await paystackService.verifyTransaction(reference);
      
      if (verification.data.status === 'success') {
        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            details: {
              ...(details || {}),
              provider: 'paystack',
              paystackData: verification.data,
              manualVerificationAt: new Date().toISOString(),
            }
          },
        });

        // Update user wallet balance
        const amountInNaira = verification.data.amount / 100; // Convert from kobo to naira
        await prisma.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: amountInNaira,
            },
          },
        });

        console.log(`Manual verification completed for user ${userId}: ₦${amountInNaira}`);

        return NextResponse.json({
          reference: verification.data.reference,
          status: 'success',
          amount: amountInNaira,
          fee: verification.data.fees || 0,
          currency: verification.data.currency,
          gateway: verification.data.channel,
          transactionDate: verification.data.paid_at,
        });
      } else {
        // Update transaction as failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            details: {
              ...(details || {}),
              provider: 'paystack',
              verificationError: 'Payment verification failed',
              paystackData: verification.data,
            }
          },
        });

        return NextResponse.json({
          reference: verification.data.reference,
          status: 'failed',
          amount: transaction.amount,
          fee: 0,
          currency: 'NGN',
          gateway: 'paystack',
          transactionDate: transaction.createdAt.toISOString(),
        });
      }
    } catch (verifyError: any) {
      console.error('Payment verification error:', verifyError);
      return NextResponse.json({
        reference: transaction.reference,
        status: 'pending',
        amount: transaction.amount,
        fee: 0,
        currency: 'NGN',
        gateway: 'paystack',
        transactionDate: transaction.createdAt.toISOString(),
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

// Utility: gracefully handle flat vs nested Nomba response
function nominalize(data: any) {
  return data;
}