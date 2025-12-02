import { apiHandler } from '@/lib/api-handler';
import { referralService } from '@/lib/services/ReferralService';
import { successResponse } from '@/lib/api-response';
import { BadRequestError } from '@/lib/errors';

export const GET = apiHandler(async (req) => {
  const user = req.user;
  if (!user) throw new BadRequestError('User not authenticated');

  const stats = await referralService.getReferralStats(user.id);
  return successResponse(stats, 'Referral stats retrieved successfully');
});
