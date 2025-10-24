/**
 * Referral Service
 * Handles referral bonus computation and distribution
 */

import { prisma } from '@/lib/prisma'

interface ReferralConfig {
  newUserBonus: number // Bonus for referred user on first purchase
  referrerCommission: number // Commission for referrer on referred user's purchases
  newUserSignupBonus: number // Immediate bonus when user signs up via referral
}

const config: ReferralConfig = {
  newUserBonus: 100, // ₦100 bonus for referred user
  referrerCommission: 50, // ₦50 commission for referrer on each purchase
  newUserSignupBonus: 500, // ₦500 bonus when referred user joins
}

/**
 * Process referral bonus when referred user makes first purchase
 */
export async function processReferralBonus(
  referredUserId: string,
  transactionId: string,
  transactionAmount: number
) {
  try {
    // Find the referral relationship
    const referral = await prisma.referral.findFirst({
      where: {
        referredId: referredUserId,
        status: 'PENDING',
      },
    })

    if (!referral) {
      console.log(`No pending referral found for user ${referredUserId}`)
      return
    }

    // Create referral earning record for referred user
    await prisma.referralEarning.create({
      data: {
        userId: referredUserId,
        transactionId,
        amount: config.newUserBonus,
        type: 'REFERRAL_BONUS',
        status: 'PAID',
        description: `Referral bonus for first purchase`,
        paidAt: new Date(),
      },
    })

    // Credit referred user's wallet
    await prisma.user.update({
      where: { id: referredUserId },
      data: {
        credits: {
          increment: config.newUserBonus,
        },
      },
    })

    // Create referral earning record for referrer
    await prisma.referralEarning.create({
      data: {
        userId: referral.referrerId,
        referredUserId,
        transactionId,
        amount: config.referrerCommission,
        type: 'AGENT_COMMISSION',
        status: 'PAID',
        description: `Commission from referral purchase`,
        paidAt: new Date(),
      },
    })

    // Credit referrer's wallet
    await prisma.user.update({
      where: { id: referral.referrerId },
      data: {
        credits: {
          increment: config.referrerCommission,
        },
      },
    })

    // Mark referral as completed
    await prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'COMPLETED' },
    })

    console.log(
      `Referral bonus processed: ${referredUserId} earned ₦${config.newUserBonus}, ${referral.referrerId} earned ₦${config.referrerCommission}`
    )

  } catch (error: any) {
    console.error('Error processing referral bonus:', error)
    throw error
  }
}

/**
 * Award signup bonus when referred user completes registration
 */
export async function awardSignupBonus(userId: string, referrerId: string) {
  try {
    // Create referral record
    const referral = await prisma.referral.create({
      data: {
        referrerId,
        referredId: userId,
        reward: config.newUserSignupBonus,
        status: 'PENDING',
      },
    })

    // Create referral earning for signup bonus
    await prisma.referralEarning.create({
      data: {
        userId,
        transactionId: undefined,
        amount: config.newUserSignupBonus,
        type: 'REFERRAL_BONUS',
        status: 'PAID',
        description: 'Referral signup bonus',
        paidAt: new Date(),
      },
    })

    // Credit user's wallet with signup bonus
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: config.newUserSignupBonus,
        },
      },
    })

    console.log(`Signup bonus awarded to user ${userId}: ₦${config.newUserSignupBonus}`)

  } catch (error: any) {
    console.error('Error awarding signup bonus:', error)
    throw error
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string) {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
    })

    const earnings = await prisma.referralEarning.findMany({
      where: { userId },
    })

    const totalEarned = earnings.reduce((sum: number, earning: any) => sum + earning.amount, 0)
    const paidEarnings = earnings
      .filter((e: any) => e.status === 'PAID')
      .reduce((sum: number, e: any) => sum + e.amount, 0)
    const pendingEarnings = earnings
      .filter((e: any) => e.status === 'PENDING')
      .reduce((sum: number, e: any) => sum + e.amount, 0)

    return {
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter((r: any) => r.status === 'COMPLETED').length,
      pendingReferrals: referrals.filter((r: any) => r.status === 'PENDING').length,
      totalEarned,
      paidEarnings,
      pendingEarnings,
      referrals: referrals.map((r: any) => ({
        id: r.id,
        referredId: r.referredId,
        reward: r.reward,
        status: r.status,
        createdAt: r.createdAt,
      })),
    }
  } catch (error: any) {
    console.error('Error fetching referral stats:', error)
    throw error
  }
}

/**
 * Get referral earning history
 */
export async function getReferralEarningHistory(userId: string, limit = 10) {
  try {
    const earnings = await prisma.referralEarning.findMany({
      where: { userId },
      include: {
        referredUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        transaction: {
          select: { id: true, type: true, amount: true, reference: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return earnings
  } catch (error: any) {
    console.error('Error fetching referral earning history:', error)
    throw error
  }
}

export default {
  processReferralBonus,
  awardSignupBonus,
  getReferralStats,
  getReferralEarningHistory,
}
