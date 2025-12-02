import { prisma } from '../prisma';
import { TargetType, TargetPeriod, TransactionType } from '@prisma/client';
import { walletService } from './WalletService';

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
      },
      {
        title: 'Weekly Spender',
        description: 'Spend ₦50,000 this week',
        type: TargetType.AMOUNT_SPENT,
        period: TargetPeriod.WEEKLY,
        targetValue: 50000,
        rewardAmount: 500,
      },
      {
        title: 'Monthly Power User',
        description: 'Complete 50 transactions this month',
        type: TargetType.TRANSACTION_COUNT,
        period: TargetPeriod.MONTHLY,
        targetValue: 50,
        rewardAmount: 1000,
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
    const targets = await prisma.salesTarget.findMany({
      where: { isActive: true }
    });

    const now = new Date();

    for (const target of targets) {
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
            currentValue: 0
          }
        });
      }

      if (progress.isClaimed) continue;

      // Calculate increment
      let increment = 0;

      if (target.type === TargetType.AMOUNT_SPENT) {
        increment = amount;
      } else if (target.type === TargetType.TRANSACTION_COUNT) {
        increment = 1;
      } else if (target.type === TargetType.DATA_VOLUME && transactionType === 'DATA') {
        // Extract GB from metadata if possible, or assume amount roughly maps to volume?
        // Ideally metadata should have 'volume' or 'plan'
        // For now, let's assume metadata.volume exists or parse from description
        // This is tricky without standardized metadata. 
        // Let's assume metadata has 'volume' in GB or MB.
        if (metadata?.volume) {
           // Convert to GB
           const vol = String(metadata.volume).toLowerCase();
           if (vol.includes('gb')) increment = parseFloat(vol);
           else if (vol.includes('mb')) increment = parseFloat(vol) / 1024;
        }
      }

      if (increment > 0) {
        await prisma.userTargetProgress.update({
          where: { id: progress.id },
          data: { currentValue: { increment } }
        });
      }
    }
  }

  /**
   * Get user targets and progress
   */
  async getUserTargets(userId: string) {
    await this.initializeDefaults(); // Ensure defaults exist

    const now = new Date();
    const targets = await prisma.salesTarget.findMany({
      where: { isActive: true }
    });

    const result = [];

    for (const target of targets) {
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

      result.push({
        ...target,
        progress: progress ? progress.currentValue : 0,
        isClaimed: progress ? progress.isClaimed : false,
        canClaim: progress ? (!progress.isClaimed && progress.currentValue >= target.targetValue) : false,
        periodEnd: progress?.periodEnd
      });
    }

    return result;
  }

  /**
   * Claim reward for a completed target
   */
  async claimReward(userId: string, targetId: string) {
    const now = new Date();
    const target = await prisma.salesTarget.findUnique({ where: { id: targetId } });
    if (!target) throw new Error('Target not found');

    const { start } = this.getPeriodDates(target.period, now);

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
    if (progress.isClaimed) throw new Error('Reward already claimed');
    if (progress.currentValue < target.targetValue) throw new Error('Target not reached');

    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Mark as claimed
      await tx.userTargetProgress.update({
        where: { id: progress.id },
        data: { 
          isClaimed: true,
          claimedAt: new Date()
        }
      });

      // Credit wallet
      await walletService.addBalance({
        userId,
        amount: target.rewardAmount,
        type: TransactionType.REFERRAL_BONUS, // Using Referral Bonus type for now or generic bonus
        reference: `REWARD-${progress.id}`,
        description: `Reward for ${target.title}`,
        metadata: {
          targetId,
          period: target.period
        }
      });

      return { success: true, amount: target.rewardAmount };
    });
  }

  private getPeriodDates(period: TargetPeriod, date: Date) {
    const start = new Date(date);
    const end = new Date(date);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (period === TargetPeriod.DAILY) {
      // Already set for today
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

    return { start, end };
  }
}

export const targetService = new TargetService();
