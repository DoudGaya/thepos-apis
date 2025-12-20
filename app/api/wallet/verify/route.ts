/**
 * Wallet Verification API
 * POST - Verify Paystack transaction and credit user wallet
 * GET - Query transaction status
 */

import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import paystackService from '@/lib/paystack'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'

const verifyTransactionSchema = z.object({
  reference: z.string().min(1, 'Transaction reference is required'),
})

/**
 * GET /api/wallet/verify?reference=FUND_XXX
 * Check transaction status
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const reference = url.searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 })
    }

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        reference,
        type: 'WALLET_FUNDING'
      },
      include: { user: { select: { id: true, email: true } } }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      }
    })
  } catch (error: any) {
    console.error('Transaction status check error:', error)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}

/**
 * POST /api/wallet/verify
 * Verify Paystack transaction and credit wallet
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const data = (await validateRequestBody(request, verifyTransactionSchema)) as z.infer<typeof verifyTransactionSchema>

  // Find the transaction
  const transaction = await prisma.transaction.findFirst({
    where: {
      reference: data.reference,
      userId: user.id,
      type: 'WALLET_FUNDING'
    }
  })

  if (!transaction) {
    throw new BadRequestError('Transaction not found')
  }

  if (transaction.status === 'SUCCESS') {
    return successResponse({
      message: 'Payment already verified',
      status: 'success',
      amount: transaction.amount
    })
  }

  if (transaction.status === 'FAILED') {
    throw new BadRequestError('Payment failed')
  }

  // Verify with Paystack
  try {
    const verification = await paystackService.verifyTransaction(data.reference)

    if (verification.data.status === 'success') {
      // Calculate amount in naira (Paystack returns amount in kobo)
      const amountInNaira = verification.data.amount / 100

      if (amountInNaira !== transaction.amount) {
        throw new BadRequestError('Transaction amount mismatch')
      }

      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          details: {
            ...(transaction.details as Record<string, any> || {}),
            paystackData: {
              paidAt: verification.data.paid_at,
              channel: verification.data.channel,
              currency: verification.data.currency,
              fees: verification.data.fees,
              gatewayResponse: verification.data.gateway_response,
            },
            verifiedAt: new Date().toISOString(),
          }
        },
      })

      // Update user wallet balance
      await prisma.user.update({
        where: { id: transaction.userId },
        data: {
          credits: {
            increment: amountInNaira,
          },
        },
      })

      // Create success notification
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          title: 'Wallet Funded Successfully',
          message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()}`,
          type: 'TRANSACTION',
        },
      })

      return successResponse({
        message: 'Payment verified and wallet credited successfully',
        status: 'success',
        amount: amountInNaira,
        transaction: {
          id: transaction.id,
          reference: transaction.reference,
          status: 'SUCCESS'
        }
      })
    } else {
      // Update transaction as failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          details: {
            ...(transaction.details as Record<string, any> || {}),
            verificationError: 'Payment not successful',
            paystackData: verification.data,
          }
        },
      })

      // Create failure notification
      await prisma.notification.create({
        data: {
          userId: transaction.userId,
          title: 'Wallet Funding Failed',
          message: 'Your wallet funding attempt was not successful. Please try again.',
          type: 'TRANSACTION',
        },
      })

      throw new BadRequestError('Payment verification failed')
    }
  } catch (verifyError: any) {
    // Update transaction as failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        details: {
          ...(transaction.details as Record<string, any> || {}),
          error: verifyError.message,
        }
      },
    })

    throw verifyError
  }
})