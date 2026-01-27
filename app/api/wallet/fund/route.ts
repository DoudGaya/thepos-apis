/**
 * Fund Wallet API
 * POST - Initialize Paystack or OPay payment for wallet funding
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import paystackService from '@/lib/paystack'
import opayService from '@/lib/services/OpayService'
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
  paymentMethod: z.enum(['paystack', 'opay']).default('paystack'),
  callbackUrl: z.string().url().optional(),
})

/**
 * POST /api/wallet/fund
 * Initialize wallet funding with Paystack or OPay
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const data = (await validateRequestBody(request, fundWalletSchema)) as z.infer<typeof fundWalletSchema>

  const { amount, paymentMethod } = data

  // Generate unique reference
  const reference = generateReference('FUND')

  // Create pending transaction record
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'WALLET_FUNDING',
      amount,
      status: 'PENDING',
      reference,
      details: {
        paymentMethod,
      },
    },
  })

  try {
    if (paymentMethod === 'opay') {
      // Initialize OPay payment
      if (!opayService.isConfigured()) {
        throw new BadRequestError('OPay payment is not configured');
      }

      const amountInKobo = Math.round(amount * 100);

      // Fetch full user details from database to get phone number
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true },
      });

      if (!dbUser) {
        throw new BadRequestError('User not found');
      }

      // OPay Payment
      const opayPaymentData = {
        reference,
        amount: amountInKobo, // Convert to kobo (OPay requires amount in kobo/cents)
        currency: 'NGN',
        country: 'NG',
        userInfo: {
          userEmail: dbUser.email,
          userId: dbUser.id,
          userName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || dbUser.email.split('@')[0],
          userMobile: dbUser.phone || '',
        },
        // Production URL for OPay callback
        callbackUrl: `${process.env.NEXTAUTH_URL || 'https://pay.nillar.com'}/api/webhooks/opay`,
        returnUrl: `${process.env.NEXTAUTH_URL || 'https://pay.nillar.com'}/wallet`,
      };

      const paymentResponse = await opayService.initializePayment(opayPaymentData);

      // Check for SDK params (Native Flow)
      if (paymentResponse.data?.payParams) {

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            details: {
              paymentMethod: 'opay',
              opayReference: reference,
              sdkParams: paymentResponse.data.payParams
            },
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            payParams: paymentResponse.data.payParams,
            reference: reference, // Ensure reference matches
            transaction: {
              id: transaction.id,
              reference,
              amount,
            },
          },
        });
      }

      // Fallback: Web Flow (Extract payment URL)
      const paymentUrl = paymentResponse.data?.nextAction?.redirectUrl || paymentResponse.data?.cashierUrl;

      if (!paymentUrl) {
        console.error('❌ [Fund] OPay response missing payment URL/params:', paymentResponse);
        throw new Error('OPay did not return a valid payment configuration');
      }

      console.log('✅ [Fund] OPay payment URL:', paymentUrl);

      // Update transaction with OPay details
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          details: {
            paymentMethod: 'opay',
            opayReference: reference,
            opayOrderNo: paymentResponse.data.orderNo,
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          authorizationUrl: paymentUrl,
          reference: paymentResponse.data.reference,
          publicKey: process.env.OPAY_PUBLIC_KEY,
          transaction: {
            id: transaction.id,
            reference,
            amount,
          },
        },
      });
    } else {
      // Initialize Paystack payment (existing code)
      const paystackResponse = await paystackService.initializeTransaction({
        amount: amount * 100, // Convert to kobo
        email: user.email,
        reference,
        callback_url: data.callbackUrl || `${process.env.NEXTAUTH_URL}/dashboard/wallet?payment=success`,
        metadata: {
          user_id: user.id,
          transaction_id: transaction.id,
          purpose: 'wallet_funding',
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      });

      if (!paystackResponse.status) {
        throw new BadRequestError('Failed to initialize payment');
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
      });

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
      }, 'Payment initialized successfully');
    }
  } catch (error: any) {
    // Update transaction as failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        details: {
          paymentMethod,
          error: error.message,
          failedAt: new Date().toISOString(),
        },
      },
    });

    throw error;
  }
})
