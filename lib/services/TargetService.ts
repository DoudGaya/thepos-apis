import { prisma } from '../prisma';
import { TargetType, TargetPeriod, TransactionType, TierType, TargetAudience, Prisma } from '@prisma/client';
import { walletService } from './WalletService';

interface Tier {
  name: string;
  value: number;
  reward: number;
}

interface CompletedTarget {
  targetId: string;
  title: string;
  reward: number;
}

export class TargetService {

  /**
   * Initialize default targets if they don't exist
   */
  async initializeDefaults() {
    const defaults = [
      {
        title: 'Daily Data Champion',
        description: 'Purchase 5GB of data today',
        type: TargetType.DATA_VOLUME,
        period: TargetPeriod.DAILY,
        targetValue: 5, // 5 GB
        rewardAmount: 100,
        tierType: TierType.SINGLE,
      },
      {
        title: 'Weekly Spender',
        description: 'Spend ₦50,000 this week',
        type: TargetType.AMOUNT_SPENT,
        period: TargetPeriod.WEEKLY,
        targetValue: 50000,
        rewardAmount: 500,
        tierType: TierType.SINGLE,
      },
      {
        title: 'Monthly Power User',
        description: 'Complete 50 transactions this month',
        type: TargetType.TRANSACTION_COUNT,
        period: TargetPeriod.MONTHLY,
        targetValue: 50,
        rewardAmount: 1000,
        tierType: TierType.SINGLE,
      }
    ];

    for (const def of defaults) {
      const existing = await prisma.salesTarget.findFirst({
        where: {
          type: def.type,
          period: def.period
        }
      });

      if (!existing) {
        await prisma.salesTarget.create({ data: def });
      }
    }
  }

  /**
   * Update progress for a user based on a transaction
   */
  async updateProgress(userId: string, transactionType: TransactionType, amount: number, metadata?: any) {
    // 1. Get active targets
    const targets = await this.getActiveTargets(userId);
    const now = new Date();

    for (const target of targets) {
      // Filter by service type / network if specified
      if (target.serviceType && target.serviceType !== transactionType) continue;
      // if (target.network && target.network !== metadata?.network) continue; // Add network check if needed

      // Determine period start/end
      const { start, end } = this.getPeriodDates(target.period, now);

      // Find or create progress record
      let progress = await prisma.userTargetProgress.findUnique({
        where: {
          userId_targetId_periodStart: {
            userId,
            targetId: target.id,
            periodStart: start
          }
        }
      });

      if (!progress) {
        progress = await prisma.userTargetProgress.create({
          data: {
            userId,
            targetId: target.id,
            periodStart: start,
            periodEnd: end,
            currentValue: 0,
            firstProgressAt: now,
            transactionCount: 0
          }
        });
      }

      // Calculate increment
      let increment = 0;

      if (target.type === TargetType.AMOUNT_SPENT) {
        increment = amount;
      } else if (target.type === TargetType.TRANSACTION_COUNT) {
        increment = 1;
      } else if (target.type === TargetType.DATA_VOLUME && transactionType === 'DATA') {
        if (metadata?.volume) {
          const vol = String(metadata.volume).toLowerCase();
          if (vol.includes('gb')) increment = parseFloat(vol);
          else if (vol.includes('mb')) increment = parseFloat(vol) / 1024;
          else if (!isNaN(parseFloat(vol))) increment = parseFloat(vol); // Assume GB if simple number
        }
      }

      if (increment > 0) {
        await prisma.userTargetProgress.update({
          where: { id: progress.id },
          data: {
            currentValue: { increment },
            lastProgressAt: now,
            transactionCount: { increment: 1 }
          }
        });
      }
    }
  }

  /**
   * Get user targets with enhanced tier info
   */
  async getUserTargetsEnhanced(userId: string) {
    await this.initializeDefaults();

    const targets = await this.getActiveTargets(userId);
    const now = new Date();

    const result = await Promise.all(targets.map(async (target) => {
      const { start } = this.getPeriodDates(target.period, now);

      const progress = await prisma.userTargetProgress.findUnique({
        where: {
          userId_targetId_periodStart: {
            userId,
            targetId: target.id,
            periodStart: start
          }
        }
      });

      const currentVal = progress ? progress.currentValue : 0;
      const isClaimed = progress ? progress.isClaimed : false;

      let enhancedTarget: any = {
        ...target,
        progress: currentVal,
        isClaimed,
        periodEnd: progress?.periodEnd || this.getPeriodDates(target.period, now).end,
        canClaim: false // Calculated below
      };

      if (target.tierType === TierType.MULTIPLE && target.tiers) {
        const tiers = JSON.parse(target.tiers as string) as Tier[];
        const achievedTiers = tiers.map((tier, index) => ({
          ...tier,
          achieved: currentVal >= tier.value,
          tierNumber: index,
          claimed: progress?.currentTier !== null && progress.currentTier !== undefined && index <= progress.currentTier
        }));

        const nextTier = achievedTiers.find(t => !t.achieved);
        const nextClaimable = achievedTiers.find(t => t.achieved && !t.claimed);

        enhancedTarget.tiers = achievedTiers;
        enhancedTarget.nextMilestone = nextTier ? {
          value: nextTier.value,
          reward: nextTier.reward,
          remaining: nextTier.value - currentVal
        } : null;
        enhancedTarget.canClaim = !!nextClaimable;
        enhancedTarget.nextClaimableTier = nextClaimable;

      } else {
        // Single tier
        enhancedTarget.canClaim = !isClaimed && currentVal >= target.targetValue;
      }

      return enhancedTarget;
    }));

    return result;
  }

  // Backwards compatibility
  async getUserTargets(userId: string) {
    return this.getUserTargetsEnhanced(userId);
  }

  /**
   * Claim reward for a completed target (Tiered or Single)
   */
  async claimTierReward(userId: string, targetId: string, tierId?: number) {
    const target = await prisma.salesTarget.findUnique({ where: { id: targetId } });
    if (!target) throw new Error('Target not found');

    const { start } = this.getPeriodDates(target.period, new Date());

    const progress = await prisma.userTargetProgress.findUnique({
      where: {
        userId_targetId_periodStart: {
          userId,
          targetId,
          periodStart: start
        }
      }
    });

    if (!progress) throw new Error('No progress found');

    let rewardAmount: number;
    let tierName: string | undefined;

    if (target.tierType === TierType.MULTIPLE) {
      // Auto-detect next claimable tier if tierId not provided
      const tiers = JSON.parse(target.tiers as string) as Tier[];

      // If no tierId provided, look for first unclaimed achieved tier
      let calculatedTierId = tierId;
      if (calculatedTierId === undefined) {
        // Find the first tier that is achieved but not claimed (index > currentTier)
        const currentTierIndex = progress.currentTier ?? -1;
        const nextIndex = tiers.findIndex((t, idx) => idx > currentTierIndex && progress.currentValue >= t.value);
        if (nextIndex === -1) throw new Error('No claimable rewards available');
        calculatedTierId = nextIndex;
      }

      const tier = tiers[calculatedTierId];
      if (!tier) throw new Error('Invalid tier');

      if (progress.currentValue < tier.value) {
        throw new Error('Tier requirement not met');
      }

      if (progress.currentTier !== null && calculatedTierId <= progress.currentTier) {
        throw new Error('Tier already claimed');
      }

      rewardAmount = tier.reward;
      tierName = tier.name;
      tierId = calculatedTierId; // Ensure we use the resolved one

    } else {
      // Single tier
      if (progress.isClaimed) throw new Error('Reward already claimed');
      if (progress.currentValue < target.targetValue) {
        throw new Error('Target not reached');
      }
      rewardAmount = target.rewardAmount;
    }

    // ATOMIC TRANSACTION
    return await prisma.$transaction(async (tx) => {
      // Update progress
      await tx.userTargetProgress.update({
        where: { id: progress.id },
        data: {
          isClaimed: target.tierType === TierType.SINGLE,
          currentTier: tierId !== undefined ? tierId : progress.currentTier,
          claimedAt: target.tierType === TierType.SINGLE ? new Date() : (tierId !== undefined ? new Date() : progress.claimedAt),
          claimedAmount: { increment: rewardAmount }
        }
      });

      // Create reward history
      await tx.rewardHistory.create({
        data: {
          userId,
          targetId,
          progressId: progress.id,
          amount: rewardAmount,
          tier: tierId,
          tierName
        }
      });

      // Credit wallet
      const walletResult = await walletService.addBalance({
        userId,
        amount: rewardAmount,
        type: TransactionType.REFERRAL_BONUS, // Or a new type REWARD
        reference: `REWARD-${progress.id}-${tierId !== undefined ? tierId : 'single'}-${Date.now()}`,
        description: tierName
          ? `Reward for ${target.title} - ${tierName} Tier`
          : `Reward for ${target.title}`,
        metadata: { targetId, tier: tierId, tierName }
      });

      // Update target analytics
      await tx.salesTarget.update({
        where: { id: targetId },
        data: {
          totalCompletions: { increment: 1 },
          totalRewardsPaid: { increment: rewardAmount }
        }
      });

      return {
        success: true,
        amount: rewardAmount,
        tierName,
        transactionId: transaction.id
      };
    });
  }

  // Alias for backward compatibility if needed, but we should use claimTierReward
  async claimReward(userId: string, targetId: string) {
    return this.claimTierReward(userId, targetId);
  }

  /**
   * Check for completed but unclaimed targets
   */
  async checkCompletedTargets(userId: string): Promise<CompletedTarget[]> {
    const targets = await this.getUserTargetsEnhanced(userId);

    return targets
      .filter(t => t.canClaim)
      .map(t => ({
        targetId: t.id,
        title: t.title,
        reward: t.tierType === TierType.SINGLE
          ? t.rewardAmount
          : t.nextClaimableTier?.reward || 0
      }));
  }

  async getActiveTargets(userId?: string) {
    const now = new Date();
    const where: Prisma.SalesTargetWhereInput = {
      isActive: true,
      isVisible: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null }
      ]
    };

    const allTargets = await prisma.salesTarget.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    if (!userId) return allTargets;

    // Filter by audience
    return allTargets.filter(target => {
      if (target.audience === TargetAudience.ALL) return true;
      if (target.audience === TargetAudience.SPECIFIC && target.specificUserIds) {
        const allowedIds = target.specificUserIds as string[];
        return allowedIds.includes(userId);
      }
      return false;
    });
  }

  // --- Admin Methods ---

  async getAllTargets() {
    return await prisma.salesTarget.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTarget(data: Prisma.SalesTargetCreateInput) {
    return await prisma.salesTarget.create({
      data
    });
  }

  async updateTarget(id: string, data: Prisma.SalesTargetUpdateInput) {
    return await prisma.salesTarget.update({
      where: { id },
      data
    });
  }

  async getTargetProgress(targetId: string) {
    return await prisma.userTargetProgress.findMany({
      where: { targetId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { currentValue: 'desc' }
    });
  }

  async getAdminTargetStats(targetId: string) {
    const target = await prisma.salesTarget.findUnique({ where: { id: targetId } });
    if (!target) throw new Error('Target not found');

    const progress = await prisma.userTargetProgress.findMany({
      where: { targetId }
    });

    const totalParticipants = progress.length;
    const totalCompleted = progress.filter(p => p.isClaimed || (p.currentTier !== null && p.currentTier !== undefined)).length;
    const totalRewardsPaid = progress.reduce((acc, p) => acc + p.claimedAmount, 0);

    return {
      target,
      stats: {
        totalParticipants,
        totalCompleted,
        totalRewardsPaid
      }
    };
  }

  public getPeriodDates(period: TargetPeriod, date: Date) {
    const start = new Date(date);
    const end = new Date(date);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (period === TargetPeriod.DAILY) {
      // Set for today
    } else if (period === TargetPeriod.WEEKLY) {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    } else if (period === TargetPeriod.MONTHLY) {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
    }
    // CUSTOM period usually relies on startDate/endDate of the target itself, 
    // but progress is tracked per recurrence period if needed. 
    // For simplicity, if CUSTOM, maybe we just use startDate/endDate of target context or global forever?
    // Let's assume CUSTOM uses the target's specific start/end dates if provided, handled by caller or defaults to wide range.
    // For now, if passed CUSTOM, effectively make it infinite or same as Daily to avoid crashes.

    return { start, end };
  }
}

export const targetService = new TargetService();
