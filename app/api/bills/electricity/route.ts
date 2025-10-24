/**
 * Electricity Purchase API
 * POST - Purchase electricity tokens for prepaid/postpaid meters
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import vtuService from '@/lib/vtu'
import { calculateElectricityPricing, formatTransactionDetails } from '@/lib/services/pricing'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

const electricityProviders = [
  'EKEDC', 'IKEDC', 'AEDC', 'PHED', 'JED', 'IBEDC', 'KAEDCO', 'KEDCO'
] as const;

const electricityPurchaseSchema = z.object({
  provider: z.enum(electricityProviders, {
    errorMap: () => ({ message: 'Invalid electricity provider' }),
  }),
  meterNumber: z.string().min(10, 'Invalid meter number'),
  meterType: z.enum(['prepaid', 'postpaid']).default('prepaid'),
  vendorCost: z.number().min(1000, 'Minimum amount is ₦1,000').max(100000, 'Maximum amount is ₦100,000'),
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
});

export const POST = apiHandler(async (req) => {
  // Get authenticated user
  const user = await getAuthenticatedUser()

  // Validate request body
  const body = await validateRequestBody(req, electricityPurchaseSchema)
  const { 
    provider, 
    meterNumber, 
    meterType, 
    vendorCost, 
    customerName, 
    customerAddress 
  } = body as z.infer<typeof electricityPurchaseSchema>

  // Calculate pricing with ₦100 profit margin
  const { sellingPrice, profit } = calculateElectricityPricing(vendorCost)

  // Get user with wallet balance
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, credits: true, email: true, firstName: true, lastName: true },
  })

  if (!dbUser) {
    throw new BadRequestError('User not found')
  }

  // Check wallet balance
  if (dbUser.credits < sellingPrice) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Required: ₦${sellingPrice.toLocaleString()}, Available: ₦${dbUser.credits.toLocaleString()}`
    )
  }

  // Generate reference
  const reference = generateReference('ELEC')

  // Create pending transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: dbUser.id,
      type: 'ELECTRICITY',
      amount: sellingPrice,
      status: 'PENDING',
      reference,
      details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
        description: `${provider} Electricity - ${meterNumber}`,
        provider,
        meterNumber,
        meterType,
        customerName,
        customerAddress,
      }),
    },
  })

  try {
    // Deduct from wallet first
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: sellingPrice } },
    })

    // Purchase electricity from VTU
    const vtuResponse = await vtuService.purchaseElectricity(
      provider,
      meterNumber,
      vendorCost,
      meterType
    )

    // Update transaction as completed
    const completedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
          provider,
          meterNumber,
          meterType,
          customerName,
          customerAddress,
          token: vtuResponse.token,
          units: vtuResponse.units,
          vtuTransactionId: vtuResponse.transaction_id,
          vtuReference: vtuResponse.reference || reference,
        }),
      },
    })

    // Create success notification
    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Electricity Purchase Successful',
        message: `Your ${provider} electricity purchase was successful. Token: ${vtuResponse.token}. Cost: ₦${sellingPrice.toLocaleString()}`,
        type: 'TRANSACTION',
      },
    })

    return successResponse({
      message: 'Electricity purchased successfully',
      data: {
        transaction: completedTransaction,
        token: vtuResponse.token,
        units: vtuResponse.units,
        meterNumber,
        provider,
        vendorCost,
        sellingPrice,
        profit,
        reference,
      },
    })
  } catch (error: any) {
    console.error('Electricity purchase failed:', error)

    // Refund user wallet
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { increment: sellingPrice } },
    })

    // Update transaction as failed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
          description: `${provider} Electricity - ${meterNumber} (FAILED)`,
          provider,
          meterNumber,
          meterType,
          customerName,
          customerAddress,
          error: error.message,
        }),
      },
    })

    // Create failure notification
    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Electricity Purchase Failed',
        message: `Your electricity purchase failed. Amount refunded: ₦${sellingPrice.toLocaleString()}. ${error.message}`,
        type: 'SYSTEM',
      },
    })

    throw new BadRequestError(error.message || 'Electricity purchase failed')
  }
})
