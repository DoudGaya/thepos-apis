/**
 * POST /api/referrals/apply
 * Apply a referral code post-signup. Useful when a user skipped it during
 * registration or arrived via a deep link after already creating their account.
 *
 * Rules:
 *  - User must not already have a referredBy set.
 *  - Code must belong to a different user.
 *  - Account must be ≤ 30 days old.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'
import { referralService } from '@/lib/services/ReferralService'

const applySchema = z.object({
  code: z.string().min(1, 'Referral code is required').trim(),
})

export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)
  const { code } = (await validateRequestBody(request, applySchema)) as z.infer<typeof applySchema>

  // Fetch current user state
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { referredBy: true, referralCode: true, createdAt: true },
  })

  if (!currentUser) throw new BadRequestError('User not found')

  // Already has a referrer
  if (currentUser.referredBy) {
    throw new BadRequestError('You have already used a referral code')
  }

  // Cannot use your own referral code
  if (currentUser.referralCode === code) {
    throw new BadRequestError('You cannot use your own referral code')
  }

  // Account must be ≤ 30 days old
  const accountAgeDays =
    (Date.now() - new Date(currentUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (accountAgeDays > 30) {
    throw new BadRequestError(
      'Referral codes can only be applied within 30 days of account creation'
    )
  }

  // Validate the code exists
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, firstName: true },
  })

  if (!referrer) throw new BadRequestError('Invalid referral code')

  // Process via ReferralService (creates Referral record + sets referredBy)
  await referralService.processSignupReward(user.id, code)

  return NextResponse.json({
    success: true,
    message: `Referral code applied! You were referred by ${referrer.firstName ?? 'a friend'}.`,
  })
})
