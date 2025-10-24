import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import vtuService from '@/lib/vtu'
import { calculateCableTVPricing, formatTransactionDetails } from '@/lib/services/pricing'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

const cableTVProviders = ['DSTV', 'GOTV', 'STARTIMES'] as const

const cableTVPurchaseSchema = z.object({
  provider: z.enum(cableTVProviders),
  smartcardNumber: z.string().min(10),
  planCode: z.string().min(1),
  vendorCost: z.number().positive(),
  planName: z.string().optional(),
})

export const POST = apiHandler(async (req) => {
  const user = await getAuthenticatedUser()
  const body = await validateRequestBody(req, cableTVPurchaseSchema)
  const { provider, smartcardNumber, planCode, vendorCost, planName } = body as z.infer<typeof cableTVPurchaseSchema>

  const { sellingPrice, profit } = calculateCableTVPricing(vendorCost)

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

  const reference = generateReference('CABLE')
  const transaction = await prisma.transaction.create({
    data: {
      userId: dbUser.id,
      type: 'CABLE',
      amount: sellingPrice,
      status: 'PENDING',
      reference,
      details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
        description: `${provider} - ${planName || planCode}`,
        provider,
        smartcardNumber,
        planCode,
        planName,
      }),
    },
  })

  try {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { credits: { decrement: sellingPrice } },
    })

    const vtuResponse = await vtuService.purchaseCableTV(provider, smartcardNumber, planCode)

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        details: formatTransactionDetails(vendorCost, sellingPrice, profit, {
          description: `${provider} - ${planName || planCode}`,
          provider,
          smartcardNumber,
          planCode,
          planName,
          vtuTransactionId: vtuResponse.transaction_id,
        }),
      },
    })

    await prisma.notification.create({
      data: {
        userId: dbUser.id,
        title: 'Cable TV Subscription Successful',
        message: `${provider} subscription successful. Cost: ₦${sellingPrice.toLocaleString()}`,
        type: 'TRANSACTION',
      },
    })

    return successResponse({
      message: 'Subscription successful',
      data: { transaction, provider, smartcardNumber, vendorCost, sellingPrice, profit, reference },
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
        title: 'Subscription Failed',
        message: `Amount refunded: ₦${sellingPrice.toLocaleString()}`,
        type: 'SYSTEM',
      },
    })

    throw new BadRequestError(error.message || 'Subscription failed')
  }
})
