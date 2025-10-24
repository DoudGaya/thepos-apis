/**
 * Fund Wallet API
 * POST - Initialize Paystack payment for wallet funding
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import paystackService from '@/lib/paystack'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
} from '@/lib/api-utils'

// Fund wallet validation schema
const fundWalletSchema = z.object({
  amount: z.number().min(100, 'Minimum funding amount is ₦100').max(500000, 'Maximum funding amount is ₦500,000'),
  callbackUrl: z.string().url().optional(),
})

/**
 * POST /api/wallet/fund
 * Initialize wallet funding with Paystack
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, fundWalletSchema)) as z.infer<typeof fundWalletSchema>

  // Generate unique reference
  const reference = generateReference('FUND')

  // Create pending transaction record
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'WALLET_FUNDING',
      amount: data.amount,
      status: 'PENDING',
      reference,
      details: {
        paymentMethod: 'paystack',
      },
    },
  })

  // Initialize Paystack payment
  try {
    const paystackResponse = await paystackService.initializeTransaction({
      amount: data.amount * 100, // Convert to kobo
      email: user.email,
      reference,
      callback_url: data.callbackUrl || `${process.env.NEXTAUTH_URL}/dashboard/wallet?payment=success`,
      metadata: {
        user_id: user.id,
        transaction_id: transaction.id,
        purpose: 'wallet_funding',
      },
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    })

    if (!paystackResponse.status) {
      throw new BadRequestError('Failed to initialize payment')
    }

    // Update transaction with Paystack details
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        details: {
          paymentMethod: 'paystack',
          paystackReference: reference,
          paystackAccessCode: paystackResponse.data.access_code,
        },
      },
    })

    return successResponse({
      reference,
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    }, 'Payment initialized successfully')
  } catch (error: any) {
    // Mark transaction as failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED' },
    })

    throw error
  }
})
