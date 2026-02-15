import { prisma } from '../prisma';
import { walletService } from './WalletService';
import { TransactionType } from '@prisma/client';
import { notificationService } from './NotificationService';

export class ReferralService {
  private config = {
    signupBonus: 50,
    referrerBonus: 100,
    commissionPercentage: 0.01,
  };

  /**
   * Process referral reward for a new signup
   */
  async processSignupReward(newUserId: string, referralCode: string) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) return;

    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        status: 'PENDING'
      }
    });

    await prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referrer.id }
    });
  }

  /**
   * Process commission for a transaction
   * Called after a successful purchase
   * Supports Passive Referral Groups (Commission on Profit)
   */
  async processTransactionCommission(userId: string, amount: number, transactionId: string, profit: number = 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true }
    });

    if (!user?.referredBy) return;

    // Fetch referrer to check for Passive Referral Group
    const referrer = await prisma.user.findUnique({
      where: { id: user.referredBy },
      include: { passiveReferralGroup: true }
    });

    if (!referrer) return;

    let commission = 0;
    let type = 'AGENT_COMMISSION';
    let description = 'Transaction commission';
    let isPassive = false;

    // Check Passive Referral Group
    const passiveGroup = referrer.passiveReferralGroup;
    if (passiveGroup && passiveGroup.isActive) {
      if (profit > 0) {
        // Commission based on Profit
        commission = profit * (passiveGroup.commissionPercent / 100);
        type = 'PASSIVE_COMMISSION';
        description = `Passive commission from ${passiveGroup.name}`;
        isPassive = true;
      }
    } else {
      // Legacy / Default Commission (Percentage of Amount)
      commission = amount * this.config.commissionPercentage;
    }

    if (commission < 1) return;

    await walletService.addBalance({
      userId: user.referredBy,
      amount: commission,
      type: TransactionType.REFERRAL_BONUS,
      reference: `COMM-${transactionId}`,
      description: description,
      metadata: {
        sourceTransactionId: transactionId,
        sourceUserId: userId,
        commissionType: type,
        isPassive
      }
    });

    await prisma.referralEarning.create({
      data: {
        userId: user.referredBy,
        referredUserId: userId,
        transactionId,
        amount: commission,
        type: type,
        status: 'PAID',
        description: description,
        paidAt: new Date()
      }
    });

    await notificationService.notifyUser(
      user.referredBy,
      'Referral Commission Earned',
      `You earned ₦${commission.toFixed(2)} commission from a referral's transaction.`,
      'GENERAL',
      { sourceUserId: userId, amount: commission, type }
    );
  }

  /**
   * Process Fixed Referral Bonus
   * Called when a referred user funds their wallet for the first time
   */
  async processFirstFundingBonus(userId: string, fundingAmount: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referredBy: true,
        hasFundedWallet: true 
      }
    });

    if (!user?.referredBy) return;
    
    // Find active Fixed Referral Rules
    const rules = await prisma.fixedReferralRule.findMany({
      where: { 
        isActive: true,
        minFundingAmount: { lte: fundingAmount }
      },
      orderBy: { commissionValue: 'desc' }
    });

    if (!rules || rules.length === 0) return;

    // Pick the first applicable rule
    const rule = rules[0];

    // Check Audience Targeting (Simple check for now)
    if (rule.audience === 'SPECIFIC') {
        // TODO: Implement specific audience check
    }

    let bonus = 0;
    if (rule.commissionType === 'FIXED_AMOUNT') {
      bonus = rule.commissionValue;
    } else {
      // Percentage of the funding amount
      bonus = fundingAmount * (rule.commissionValue / 100);
    }

    if (bonus <= 0) return;

    await walletService.addBalance({
      userId: user.referredBy,
      amount: bonus,
      type: TransactionType.REFERRAL_BONUS,
      reference: `REF-FIXED-${userId}`,
      description: `Referral Bonus: ${rule.name}`,
      metadata: {
        sourceUserId: userId,
        ruleId: rule.id,
        fundingAmount
      }
    });

    await prisma.referralEarning.create({
      data: {
        userId: user.referredBy,
        referredUserId: userId,
        amount: bonus,
        type: 'FIXED_BONUS',
        status: 'PAID',
        description: `Fixed Bonus from rule: ${rule.name}`,
        paidAt: new Date()
      }
    });

    await notificationService.notifyUser(
      user.referredBy,
      'Referral Bonus',
      `You earned ₦${bonus.toFixed(2)} for referring a new user!`,
      'GENERAL',
      { sourceUserId: userId, amount: bonus }
    );
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
