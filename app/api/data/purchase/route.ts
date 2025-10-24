/**
 * Data Purchase API
 * POST - Purchase data bundle for any Nigerian network
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import vtuService from '@/lib/vtu'
import { calculateDataPricing, formatTransactionDetails, FIXED_PROFIT_MARGIN } from '@/lib/services/pricing'
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

// Data purchase validation schema
const dataPurchaseSchema = z.object({
  network: z.enum(['MTN', 'GLO', 'AIRTEL', '9MOBILE'], {
    errorMap: () => ({ message: 'Invalid network. Choose MTN, GLO, AIRTEL, or 9MOBILE' }),
  }),
  phone: z.string().min(11, 'Phone number is required'),
  planId: z.string().min(1, 'Plan ID is required'),
  vendorCost: z.number().min(50, 'Invalid plan amount'), // Cost from VTU provider
  planName: z.string().optional(),
})

/**
 * POST /api/data/purchase
 * Purchase data bundle with ₦100 profit margin
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, dataPurchaseSchema)) as z.infer<typeof dataPurchaseSchema>

  // Validate and format phone number
  if (!validateNigerianPhone(data.phone)) {
    throw new BadRequestError('Invalid Nigerian phone number')
  }

  const formattedPhone = formatNigerianPhone(data.phone)

  // Calculate selling price with ₦100 profit margin
  const { sellingPrice, profit } = calculateDataPricing(data.vendorCost, data.network)

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
  const reference = generateReference('DATA')

  // Create pending transaction with pricing details
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'DATA',
      amount: sellingPrice,
      status: 'PENDING',
      reference,
      details: formatTransactionDetails(data.vendorCost, sellingPrice, profit, {
        network: data.network,
        phone: formattedPhone,
        planId: data.planId,
        planName: data.planName,
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

    // Purchase data from VTU.NG
    const vtuResponse = await vtuService.purchaseData(
      data.network,
      formattedPhone,
      data.planId
    )

    // Update transaction as completed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: formatTransactionDetails(data.vendorCost, sellingPrice, profit, {
          network: data.network,
          phone: formattedPhone,
          planId: data.planId,
          planName: data.planName,
          vtuTransactionId: vtuResponse.transaction_id,
          vtuStatus: vtuResponse.status,
        }),
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Data Purchase Successful',
        message: `${data.network} ${data.planName || 'data bundle'} sent to ${formattedPhone}. Cost: ₦${sellingPrice.toLocaleString()}`,
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
        plan: data.planName,
        vendorCost: data.vendorCost,
        sellingPrice,
        profit,
        status: 'COMPLETED',
        createdAt: transaction.createdAt,
      },
      vtu: {
        transactionId: vtuResponse.transaction_id,
        status: vtuResponse.status,
      },
      balance: updatedUser?.credits || 0,
    }, 'Data purchase successful')

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
        details: formatTransactionDetails(data.vendorCost, sellingPrice, profit, {
          network: data.network,
          phone: formattedPhone,
          planId: data.planId,
          planName: data.planName,
          error: error.message,
        }),
      },
    })

    throw new BadRequestError(error.message || 'Data purchase failed. Your wallet has been refunded.')
  }
})
