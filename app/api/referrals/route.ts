/**
 * Referral API endpoints
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/referrals - Get user's referral stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's referral code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        referralCode: true,
        referredBy: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get referral stats
    const [referralCount, totalEarnings, pendingEarnings, recentReferrals] = await Promise.all([
      // Count total referrals
      prisma.user.count({
        where: { referredBy: userId },
      }),

      // Total earnings from referrals
      prisma.referralEarning.aggregate({
        where: { 
          userId: userId,
          status: 'PAID',
        },
        _sum: { amount: true },
      }),

      // Pending earnings
      prisma.referralEarning.aggregate({
        where: { 
          userId: userId,
          status: 'PENDING',
        },
        _sum: { amount: true },
      }),

      // Recent referrals (last 10)
      prisma.user.findMany({
        where: { referredBy: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Get recent earnings
    const recentEarnings = await prisma.referralEarning.findMany({
      where: { userId: userId },
      include: {
        referredUser: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        transaction: {
          select: {
            id: true,
            type: true,
            amount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralCount,
        totalEarnings: totalEarnings._sum.amount || 0,
        pendingEarnings: pendingEarnings._sum.amount || 0,
        recentReferrals: recentReferrals.map((ref: any) => ({
          id: ref.id,
          name: `${ref.firstName} ${ref.lastName}`,
          phone: ref.phone,
          joinedAt: ref.createdAt,
        })),
        recentEarnings: recentEarnings.map((earning: any) => ({
          id: earning.id,
          amount: earning.amount,
          type: earning.type,
          status: earning.status,
          referredUser: earning.referredUser ? {
            name: `${earning.referredUser.firstName} ${earning.referredUser.lastName}`,
            phone: earning.referredUser.phone,
          } : null,
          transaction: earning.transaction,
          createdAt: earning.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral stats' },
      { status: 500 }
    );
  }
}

// POST /api/referrals/validate - Validate referral code
export async function POST(request: NextRequest) {
  try {
    const { referralCode, userId } = await request.json();

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find user with this referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        referralCode: true,
      },
    });

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // Check if user is trying to refer themselves
    if (referrer.id === userId) {
      return NextResponse.json({ error: 'You cannot refer yourself' }, { status: 400 });
    }

    // Check if user is already referred
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true },
    });

    if (currentUser?.referredBy) {
      return NextResponse.json({ error: 'You have already been referred' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        referrer: {
          name: `${referrer.firstName} ${referrer.lastName}`,
          phone: referrer.phone,
        },
      },
    });
  } catch (error) {
    console.error('Referral validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate referral code' },
      { status: 500 }
    );
  }
}
