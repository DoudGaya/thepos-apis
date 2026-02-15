import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser, BadRequestError } from '@/lib/api-utils'

/**
 * GET /api/admin/referrals/rules
 * Get all fixed referral rules
 */
export const GET = apiHandler(async () => {
  const user = await getAuthenticatedUser();
  if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

  const rules = await prisma.fixedReferralRule.findMany({
      orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(rules);
});

/**
 * POST /api/admin/referrals/rules
 * Create a new fixed referral rule
 */
export const POST = apiHandler(async (req) => {
    const user = await getAuthenticatedUser();
    if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

    const body = await req.json();
    const { name, commissionType, commissionValue, minFundingAmount } = body;
    
    if (!name || !commissionType || !commissionValue) {
        throw new BadRequestError('Missing required fields');
    }

    const rule = await prisma.fixedReferralRule.create({
        data: {
            name,
            commissionType,
            commissionValue: parseFloat(commissionValue),
            minFundingAmount: parseFloat(minFundingAmount || '0'),
            isActive: true,
            audience: 'ALL'
        }
    });
    return NextResponse.json(rule);
});
