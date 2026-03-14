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
    let type = 'PASSIVE_COMMISSION';
    let description = 'Transaction commission';
    let isPassive = false;

    // Passive group members earn a % of the transaction profit
    const passiveGroup = referrer.passiveReferralGroup;
    if (passiveGroup && passiveGroup.isActive && profit > 0) {
      commission = profit * (passiveGroup.commissionPercent / 100);
      description = `Passive commission from ${passiveGroup.name}`;
      isPassive = true;
    } else {
      // Non-group referrers earn a tiered AGENT_COMMISSION based on transaction amount
      type = 'AGENT_COMMISSION';
      if (amount < 1000) {
        commission = 50;
      } else if (amount <= 5000) {
        commission = 75;
      } else {
        commission = 100;
      }
      description = 'Agent Commission';
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

    // Mark the referral record as COMPLETED on first successful transaction
    await prisma.referral.updateMany({
      where: { referrerId: user.referredBy, referredId: userId, status: 'PENDING' },
      data: { status: 'COMPLETED' },
    });

    await notificationService.notifyUser(
      user.referredBy,
      'Referral Commission Earned',
      `You earned ₦${commission.toFixed(2)} commission from a referral's transaction.`,
      'GENERAL',
      { sourceUserId: userId, amount: commission, type }
    );

    console.log(`[Referral] Commission ₦${commission.toFixed(2)} (${type}) credited to referrer ${user.referredBy} from transaction ${transactionId}`);
  }

  /**
   * Process Fixed Referral Bonus
   * Called when a referred user funds their wallet for the first time.
   * Guards against double-crediting via hasFundedWallet flag.
   * Falls back to config.referrerBonus when no FixedReferralRule is configured.
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

    // Guard: only process once per referred user
    if (user.hasFundedWallet) {
      console.log(`[Referral] First-funding bonus already processed for user ${userId}`);
      return;
    }

    // Mark wallet as funded immediately to prevent race conditions
    await prisma.user.update({
      where: { id: userId },
      data: { hasFundedWallet: true },
    });
    
    // Find active Fixed Referral Rules that match the funding amount
    const rawRules = await prisma.fixedReferralRule.findMany({
      where: { 
        isActive: true,
        minFundingAmount: { lte: fundingAmount }
      },
      orderBy: { commissionValue: 'desc' }
    });

    // Filter by audience — SPECIFIC rules only apply to targeted user IDs
    const rules = rawRules.filter(rule =>
      rule.audience === 'ALL' ||
      (rule.audience === 'SPECIFIC' &&
        Array.isArray(rule.specificUserIds) &&
        (rule.specificUserIds as string[]).includes(userId))
    );

    let bonus = 0;
    let description = '';
    let ruleId: string | undefined;

    if (rules && rules.length > 0) {
      const rule = rules[0];
      ruleId = rule.id;
      if (rule.commissionType === 'FIXED_AMOUNT') {
        bonus = rule.commissionValue;
      } else {
        bonus = fundingAmount * (rule.commissionValue / 100);
      }
      description = `First-funding Referral Bonus: ${rule.name}`;
    } else {
      // Fallback: ₦100 hardcoded bonus, but only when the referred user funds ≥ ₦1,000.
      if (fundingAmount < 1000) {
        console.log(`[Referral] First-funding bonus skipped — funding amount ₦${fundingAmount} < ₦1,000 minimum`);
        return;
      }
      bonus = this.config.referrerBonus; // ₦100
      description = 'First-funding Referral Bonus';
    }

    if (bonus <= 0) return;

    await walletService.addBalance({
      userId: user.referredBy,
      amount: bonus,
      type: TransactionType.REFERRAL_BONUS,
      reference: `REF-FIXED-${userId}`,
      description,
      metadata: {
        sourceUserId: userId,
        ruleId,
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
        description,
        paidAt: new Date()
      }
    });

    // Mark the referral record as funded (not yet completed — that happens on first purchase)
    await prisma.referral.updateMany({
      where: { referrerId: user.referredBy, referredId: userId, status: 'PENDING' },
      data: { status: 'PENDING' }, // keep PENDING until first transaction
    });

    await notificationService.notifyUser(
      user.referredBy,
      'Referral Bonus',
      `You earned ₦${bonus.toFixed(2)} for referring a new user who funded their wallet!`,
      'GENERAL',
      { sourceUserId: userId, amount: bonus }
    );

    console.log(`[Referral] First-funding bonus ₦${bonus} credited to referrer ${user.referredBy} (referred user: ${userId})`);
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
