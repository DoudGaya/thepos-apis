/**
 * Referral Withdrawal API
 * POST - Withdraw referral commission to main wallet
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

// Withdrawal validation schema
const withdrawalSchema = z.object({
  amount: z.number().min(500, 'Minimum withdrawal amount is ₦500').max(1000000, 'Maximum withdrawal amount is ₦1,000,000'),
})

/**
 * POST /api/referrals/withdraw
 * Withdraw referral commission to main wallet
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, withdrawalSchema)) as z.infer<typeof withdrawalSchema>

  // Get available referral balance
  const earnings = await prisma.referralEarning.aggregate({
    where: {
      userId: user.id,
    },
    _sum: {
      amount: true,
    },
  })

  const withdrawn = await prisma.referralEarning.aggregate({
    where: {
      userId: user.id,
      status: 'WITHDRAWN',
    },
    _sum: {
      amount: true,
    },
  })

  const totalEarned = earnings._sum.amount || 0
  const totalWithdrawn = withdrawn._sum.amount || 0
  const availableBalance = totalEarned - totalWithdrawn

  // Check if user has sufficient referral balance
  if (availableBalance < data.amount) {
    throw new InsufficientBalanceError(
      `Insufficient referral balance. Available: ₦${availableBalance.toLocaleString()}, Requested: ₦${data.amount.toLocaleString()}`
    )
  }

  // Generate unique reference
  const reference = generateReference('REF_WITHDRAW')

  // Perform withdrawal in a transaction
  await prisma.$transaction(async (tx) => {
    // Transfer to main wallet
    await tx.user.update({
      where: { id: user.id },
      data: {
        credits: {
          increment: data.amount,
        },
      },
    })

    // Mark earnings as withdrawn (up to the withdrawal amount)
    const pendingEarnings = await tx.referralEarning.findMany({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    })

    let remainingAmount = data.amount
    for (const earning of pendingEarnings) {
      if (remainingAmount <= 0) break

      if (earning.amount <= remainingAmount) {
        await tx.referralEarning.update({
          where: { id: earning.id },
          data: { status: 'WITHDRAWN' },
        })
        remainingAmount -= earning.amount
      }
    }

    // Create transaction record
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'REFERRAL_BONUS',
        amount: data.amount,
        status: 'COMPLETED',
        reference,
        details: {
          source: 'referral_commission',
          availableBalance,
        },
      },
    })

    // Create notification
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Commission Withdrawn',
        message: `₦${data.amount.toLocaleString()} referral commission transferred to your main wallet`,
        type: 'TRANSACTION',
        isRead: false,
      },
    })
  })

  // Get updated balances
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      credits: true,
    },
  })

  const newReferralBalance = availableBalance - data.amount

  return successResponse({
    withdrawal: {
      amount: data.amount,
      reference,
      newMainBalance: updatedUser?.credits || 0,
      newReferralBalance,
    },
  }, 'Commission withdrawn successfully')
})
