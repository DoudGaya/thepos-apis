/**
 * Airtime Purchase API
 * POST - Purchase airtime for any Nigerian network
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import vtuService from '@/lib/vtu'
import { calculateAirtimePricing, formatTransactionDetails } from '@/lib/services/pricing'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
  validateNigerianPhone,
  formatNigerianPhone,
} from '@/lib/api-utils'

// Airtime purchase validation schema
const airtimePurchaseSchema = z.object({
  network: z.enum(['MTN', 'GLO', 'AIRTEL', '9MOBILE'], {
    errorMap: () => ({ message: 'Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE' }),
  }),
  phone: z.string().min(11, 'Phone number is required'),
  amount: z.number().min(50, 'Minimum airtime amount is ₦50').max(50000, 'Maximum airtime amount is ₦50,000'),
})

// Profit margins by network (these should ideally come from database)
const AIRTIME_MARGINS: Record<string, number> = {
  MTN: 2.5, // 2.5% profit
  GLO: 3.0,
  AIRTEL: 2.5,
  '9MOBILE': 3.0,
}

/**
 * POST /api/airtime/purchase
 * Purchase airtime
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, airtimePurchaseSchema)) as z.infer<typeof airtimePurchaseSchema>

  // Validate and format phone number
  if (!validateNigerianPhone(data.phone)) {
    throw new BadRequestError('Invalid Nigerian phone number')
  }

  const formattedPhone = formatNigerianPhone(data.phone)

  // Calculate pricing using centralized service
  const { sellingPrice, profit } = calculateAirtimePricing(data.amount, data.network)

  // Check user balance
  const userBalance = await prisma.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  })

  if (!userBalance || userBalance.credits < sellingPrice) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Available: ₦${userBalance?.credits.toLocaleString() || 0}, Required: ₦${sellingPrice.toLocaleString()}`
    )
  }

  // Generate unique reference
  const reference = generateReference('AIRTIME')

  // Create pending transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'AIRTIME',
      amount: sellingPrice,
      status: 'PENDING',
      reference,
      details: formatTransactionDetails(data.amount, sellingPrice, profit, {
        description: `${data.network} Airtime - ${formattedPhone}`,
        network: data.network,
        phone: formattedPhone,
        amount: data.amount,
      }),
    },
  })

  try {
    // Deduct from user wallet first (reversible if VTU fails)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: {
          decrement: sellingPrice,
        },
      },
    })

    // Purchase airtime from VTU.NG
    const vtuResponse = await vtuService.purchaseAirtime(
      data.network,
      formattedPhone,
      data.amount
    )

    // Update transaction as completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: formatTransactionDetails(data.amount, sellingPrice, profit, {
          description: `${data.network} Airtime - ${formattedPhone}`,
          network: data.network,
          phone: formattedPhone,
          amount: data.amount,
          vtuTransactionId: vtuResponse.transaction_id,
          vtuStatus: vtuResponse.status,
        }),
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Airtime Purchase Successful',
        message: `${data.network} ₦${data.amount.toLocaleString()} airtime sent to ${formattedPhone}`,
        type: 'TRANSACTION',
        isRead: false,
      },
    })

    // Get updated balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    })

    return successResponse({
      transaction: {
        id: transaction.id,
        reference,
        network: data.network,
        phone: formattedPhone,
        amount: data.amount,
        status: 'COMPLETED',
        createdAt: transaction.createdAt,
      },
      vtu: {
        transactionId: vtuResponse.transaction_id,
        status: vtuResponse.status,
      },
      balance: updatedUser?.credits || 0,
    }, 'Airtime purchase successful')

  } catch (error: any) {
    // Refund user wallet
    await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: {
          increment: sellingPrice,
        },
      },
    })

    // Mark transaction as failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        details: formatTransactionDetails(data.amount, sellingPrice, profit, {
          description: `${data.network} Airtime - ${formattedPhone}`,
          network: data.network,
          phone: formattedPhone,
          amount: data.amount,
          error: error.message,
        }),
      },
    })

    throw new BadRequestError(error.message || 'Airtime purchase failed. Your wallet has been refunded.')
  }
})
