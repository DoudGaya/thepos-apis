
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { targetService } from '@/lib/services/TargetService';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targets = await targetService.getUserTargetsEnhanced(session.user.id);

    // Calculate summary stats
    const completedCount = targets.filter(t => t.isClaimed || (t.tiers && t.tiers.every((tier: any) => tier.claimed))).length;
    const totalEarnings = targets.reduce((sum, t) => {
      let earnings = 0;
      if (t.isClaimed) earnings += t.rewardAmount;
      if (t.tiers) {
        earnings += t.tiers.filter((tier: any) => tier.claimed).reduce((s: number, tr: any) => s + tr.reward, 0);
      }
      return sum + earnings;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        activeTargets: targets,
        summary: {
          totalCompleted: completedCount,
          totalEarnings: totalEarnings
        }
      }
    });
  } catch (error) {
    console.error('Error fetching targets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
