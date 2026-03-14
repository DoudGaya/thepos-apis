import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler, getAuthenticatedUser, BadRequestError } from '@/lib/api-utils'

/**
 * PATCH /api/admin/referrals/rules/[id]
 * Update a fixed referral rule
 */
export const PATCH = apiHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getAuthenticatedUser();
  if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

  const { id } = await params;
  const body = await req.json();

  const { name, commissionType, commissionValue, minFundingAmount, isActive, audience, specificUserIds } = body;

  const updated = await prisma.fixedReferralRule.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(commissionType !== undefined && { commissionType }),
      ...(commissionValue !== undefined && { commissionValue: parseFloat(commissionValue) }),
      ...(minFundingAmount !== undefined && { minFundingAmount: parseFloat(minFundingAmount) }),
      ...(isActive !== undefined && { isActive }),
      ...(audience !== undefined && { audience }),
      ...(specificUserIds !== undefined && { specificUserIds }),
    }
  });

  return NextResponse.json(updated);
});

/**
 * DELETE /api/admin/referrals/rules/[id]
 * Delete a fixed referral rule
 */
export const DELETE = apiHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getAuthenticatedUser();
  if (user.role !== 'ADMIN') throw new BadRequestError('Admin access required');

  const { id } = await params;

  await prisma.fixedReferralRule.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
