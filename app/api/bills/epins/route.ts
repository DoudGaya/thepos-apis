import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import vtuService from '@/lib/vtu'
import { calculateEpinsPricing, formatTransactionDetails } from '@/lib/services/pricing'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

const epinProviders = ['WAEC', 'NECO', 'NABTEB'] as const

const epinPurchaseSchema = z.object({
  provider: z.enum(epinProviders),
  quantity: z.number().int().positive().min(1).max(10),
  vendorCost: z.number().positive(),
})

export const POST = apiHandler(async (req) => {
  const user = await getAuthenticatedUser()
  const body = await validateRequestBody(req, epinPurchaseSchema)
  const { provider, quantity, vendorCost } = body as z.infer<typeof epinPurchaseSchema>

  const { sellingPrice, profit } = calculateEpinsPricing(vendorCost)

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

  const reference = generateReference('EPIN')
  const transaction = await prisma.transaction.create({
    data: {
      userId: dbUser.id,
      type: 'EPINS',
      amount: sellingPrice,
      status: 'PENDING',
      reference,
      details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
        description: `${provider} E-Pin Purchase (${quantity} ${quantity > 1 ? 'pins' : 'pin'})`,
        provider,
        quantity,
      }),
    },
  })

  try {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: sellingPrice } },
    })

    const vtuResponse = await vtuService.purchaseEpins(provider, quantity)

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
          description: `${provider} E-Pin Purchase (${quantity} ${quantity > 1 ? 'pins' : 'pin'})`,
          provider,
          quantity,
          pins: vtuResponse.pins,
          vtuTransactionId: vtuResponse.transaction_id,
        }),
      },
    })

    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'E-Pin Purchase Successful',
        message: `${provider} e-pin(s) purchased successfully. Quantity: ${quantity}`,
        type: 'TRANSACTION',
      },
    })

    return successResponse({
      message: 'E-Pin purchase successful',
      data: { 
        transaction, 
        provider, 
        quantity, 
        pins: vtuResponse.pins,
        vendorCost, 
        sellingPrice, 
        profit, 
        reference 
      },
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
        title: 'E-Pin Purchase Failed',
        message: `Amount refunded: ₦${sellingPrice.toLocaleString()}`,
        type: 'SYSTEM',
      },
    })

    throw new BadRequestError(error.message || 'E-Pin purchase failed')
  }
})
