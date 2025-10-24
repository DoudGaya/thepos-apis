import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import vtuService from '@/lib/vtu'
import { calculateBettingPricing, formatTransactionDetails } from '@/lib/services/pricing'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

const bettingProviders = [
  '1XBET', 'BANGBET', 'BET9JA', 'BETKING', 'BETLAND', 'BETLION',
  'BETWAY', 'CLOUDBET', 'LIVESCOREBET', 'MERRYBET', 'NAIJABET',
  'NAIRABET', 'SUPABET'
] as const

const bettingFundingSchema = z.object({
  provider: z.enum(bettingProviders),
  customerId: z.string().min(1),
  vendorCost: z.number().positive().min(100).max(100000),
})

export const POST = apiHandler(async (req) => {
  const user = await getAuthenticatedUser()
  const body = await validateRequestBody(req, bettingFundingSchema)
  const { provider, customerId, vendorCost } = body as z.infer<typeof bettingFundingSchema>

  const { sellingPrice, profit } = calculateBettingPricing(vendorCost)

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, credits: true },
  })

  if (!dbUser) throw new BadRequestError('User not found')
  if (dbUser.credits < sellingPrice) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Required: ₦${sellingPrice.toLocaleString()}, Available: ₦${dbUser.credits.toLocaleString()}`
    )
  }

  const reference = generateReference('BET')
  const transaction = await prisma.transaction.create({
    data: {
      userId: dbUser.id,
      type: 'BETTING',
      amount: sellingPrice,
      status: 'PENDING',
      reference,
      details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
        description: `${provider} Betting Wallet Funding`,
        provider,
        customerId,
      }),
    },
  })

  try {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: sellingPrice } },
    })

    const vtuResponse = await vtuService.purchaseBetting(provider, customerId, vendorCost)

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
          description: `${provider} Betting Wallet Funding`,
          provider,
          customerId,
          vtuTransactionId: vtuResponse.transaction_id,
        }),
      },
    })

    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Betting Wallet Funded',
        message: `${provider} wallet funded successfully. Amount: ₦${vendorCost.toLocaleString()}`,
        type: 'TRANSACTION',
      },
    })

    return successResponse({
      message: 'Betting wallet funded successfully',
      data: { transaction, provider, customerId, vendorCost, sellingPrice, profit, reference },
    })
  } catch (error: any) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { increment: sellingPrice } },
    })

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'FAILED' },
    })

    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Betting Funding Failed',
        message: `Amount refunded: ₦${sellingPrice.toLocaleString()}`,
        type: 'SYSTEM',
      },
    })

    throw new BadRequestError(error.message || 'Betting wallet funding failed')
  }
})
