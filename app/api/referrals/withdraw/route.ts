/**
 * Referral Withdrawal API
 * POST  — Submit a bank-account withdrawal request for referral commission.
 *          Cash is NOT credited immediately; an admin fulfils the payout.
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
  InsufficientBalanceError,
} from '@/lib/api-utils'

// ── Validation ──────────────────────────────────────────────────────────────

const withdrawalSchema = z.object({
  amount: z
    .number()
    .min(2000, 'Minimum withdrawal amount is ₦2,000')
    .max(1_000_000, 'Maximum withdrawal amount is ₦1,000,000'),
  bankName: z.string().min(2, 'Bank name is required').max(100),
  accountNumber: z
    .string()
    .length(10, 'Account number must be exactly 10 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  accountName: z.string().min(3, 'Account name is required').max(120),
})

type WithdrawalBody = z.infer<typeof withdrawalSchema>

/**
 * POST /api/referrals/withdraw
 * Submit a referral commission withdrawal request (admin-mediated payout)
 */
export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const data = (await validateRequestBody(request, withdrawalSchema)) as WithdrawalBody

  const today = new Date()

  // Cashout is only allowed on the 28th of each month (unless admin has opened withdrawals)
  const withdrawalOverride = await prisma.appSetting.findUnique({ where: { key: 'referral_withdrawals_open' } })
  const withdrawalsOpen = withdrawalOverride?.value === true || withdrawalOverride?.value === 'true'
  if (!withdrawalsOpen && today.getDate() !== 28) {
    const nextCashout = new Date(
      today.getFullYear(),
      today.getMonth() + (today.getDate() < 28 ? 0 : 1),
      28,
    )
    const formatted = nextCashout.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    throw new BadRequestError(
      `Withdrawals are only available on the 28th of each month. Next withdrawal date: ${formatted}`,
    )
  }

  // Prevent duplicate pending requests in the same month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const existing = await prisma.withdrawalRequest.findFirst({
    where: {
      userId: user.id,
      status: 'PENDING',
      createdAt: { gte: monthStart },
    },
  })
  if (existing) {
    throw new BadRequestError(
      'You already have a pending withdrawal request for this month. Please wait for it to be processed before submitting another.',
    )
  }

  // Compute available balance (earned – already withdrawn/locked)
  const [earnedAgg, lockedAgg] = await Promise.all([
    prisma.referralEarning.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    }),
    prisma.referralEarning.aggregate({
      where: { userId: user.id, status: 'WITHDRAWN' },
      _sum: { amount: true },
    }),
  ])

  const totalEarned = earnedAgg._sum.amount ?? 0
  const totalWithdrawn = lockedAgg._sum.amount ?? 0
  const availableBalance = totalEarned - totalWithdrawn

  if (availableBalance < data.amount) {
    throw new InsufficientBalanceError(
      `Insufficient referral balance. Available: ₦${availableBalance.toLocaleString()}, Requested: ₦${data.amount.toLocaleString()}`,
    )
  }

  // Lock PAID earnings + create withdrawal request in one transaction
  const withdrawalRequest = await prisma.$transaction(async (tx) => {
    // Mark PAID earnings as WITHDRAWN up to requested amount
    const paidEarnings = await tx.referralEarning.findMany({
      where: { userId: user.id, status: 'PAID' },
      orderBy: { createdAt: 'asc' },
    })

    let remaining = data.amount
    for (const earning of paidEarnings) {
      if (remaining <= 0) break
      if (earning.amount <= remaining) {
        await tx.referralEarning.update({
          where: { id: earning.id },
          data: { status: 'WITHDRAWN' },
        })
        remaining -= earning.amount
      }
    }

    // Create the withdrawal request record
    const req = await tx.withdrawalRequest.create({
      data: {
        userId: user.id,
        amount: data.amount,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        status: 'PENDING',
      },
    })

    // Notify the user
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Withdrawal Request Submitted',
        message: `Your withdrawal request of ₦${data.amount.toLocaleString()} has been submitted and is under review. Payouts are processed within 2–5 business days.`,
        type: 'TRANSACTION',
        isRead: false,
      },
    })

    return req
  })

  const newAvailableBalance = availableBalance - data.amount

  return successResponse(
    {
      request: {
        id: withdrawalRequest.id,
        amount: withdrawalRequest.amount,
        bankName: withdrawalRequest.bankName,
        accountNumber: withdrawalRequest.accountNumber,
        accountName: withdrawalRequest.accountName,
        status: withdrawalRequest.status,
        createdAt: withdrawalRequest.createdAt,
      },
      newAvailableBalance,
    },
    'Withdrawal request submitted successfully. Our team will process it within 2–5 business days.',
  )
})
