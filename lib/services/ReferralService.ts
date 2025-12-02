import { prisma } from '../prisma';
import { walletService } from './WalletService';
import { TransactionType } from '@prisma/client';

export class ReferralService {
  private config = {
    signupBonus: 50, // Bonus for the new user
    referrerBonus: 100, // Bonus for the referrer
    commissionPercentage: 0.01, // 1% commission on transactions
  };

  /**
   * Process referral reward for a new signup
   */
  async processSignupReward(newUserId: string, referralCode: string) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) return;

    // Create referral record
    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        status: 'PENDING'
      }
    });

    // Link user to referrer
    await prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referrer.id }
    });
  }

  /**
   * Process commission for a transaction
   * Called after a successful purchase
   */
  async processTransactionCommission(userId: string, amount: number, transactionId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true }
    });

    if (!user?.referredBy) return;

    const commission = amount * this.config.commissionPercentage;
    if (commission < 1) return; // Minimum commission

    // Credit referrer
    await walletService.addBalance({
      userId: user.referredBy,
      amount: commission,
      type: TransactionType.REFERRAL_BONUS,
      reference: `COMM-${transactionId}`,
      description: `Commission from referral transaction`,
      metadata: {
        sourceTransactionId: transactionId,
        sourceUserId: userId
      }
    });

    // Log earning
    await prisma.referralEarning.create({
      data: {
        userId: user.referredBy,
        referredUserId: userId,
        transactionId,
        amount: commission,
        type: 'AGENT_COMMISSION',
        status: 'PAID',
        description: 'Transaction commission',
        paidAt: new Date()
      }
    });
  }

  /**
   * Get referral stats for a user
   */
  async getReferralStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });

    const referrals = await prisma.referral.count({
      where: { referrerId: userId }
    });

    const earnings = await prisma.referralEarning.aggregate({
      where: { userId },
      _sum: { amount: true }
    });

    const recentReferrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: {
            firstName: true,
            lastName: true,
            createdAt: true,
            hasFundedWallet: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return {
      referralCode: user?.referralCode,
      totalReferrals: referrals,
      totalEarnings: earnings._sum.amount || 0,
      recentReferrals: recentReferrals.map(r => ({
        name: `${r.referred.firstName || 'User'} ${r.referred.lastName || ''}`.trim(),
        date: r.referred.createdAt,
        status: r.referred.hasFundedWallet ? 'Active' : 'Pending'
      }))
    };
  }
}

export const referralService = new ReferralService();
