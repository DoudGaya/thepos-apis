import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser, BadRequestError } from '@/lib/api-utils'

/**
 * GET /api/admin/referrals/groups
 * Get all passive referral groups
 */
export const GET = apiHandler(async () => {
  const user = await getAuthenticatedUser();
  if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

  const groups = await prisma.passiveReferralGroup.findMany({
      include: {
          _count: {
              select: { users: true }
          }
      },
      orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(groups);
});

/**
 * POST /api/admin/referrals/groups
 * Create a new passive referral group
 */
export const POST = apiHandler(async (req) => {
    const user = await getAuthenticatedUser();
    if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

    const body = await req.json();
    const { name, commissionPercent, description } = body;
    
    if (!name || commissionPercent === undefined) {
        throw new BadRequestError('Missing required fields');
    }

    const group = await prisma.passiveReferralGroup.create({
        data: {
            name,
            commissionPercent: parseFloat(commissionPercent),
            description: description || '',
            isActive: true
        }
    });
    return NextResponse.json(group);
});
