
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { targetService } from '@/lib/services/TargetService';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetId, tierId } = body;

    if (!targetId) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    const result = await targetService.claimTierReward(session.user.id, targetId, tierId);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error claiming reward:', error);
    return NextResponse.json({ error: error.message || 'Failed to claim reward' }, { status: 400 });
  }
}
