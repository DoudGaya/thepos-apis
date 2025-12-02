import { apiHandler } from '@/lib/api-handler';
import { targetService } from '@/lib/services/TargetService';
import { successResponse } from '@/lib/api-response';
import { BadRequestError } from '@/lib/errors';
import { z } from 'zod';

const claimSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
});

export const POST = apiHandler(async (req) => {
  const user = req.user;
  if (!user) throw new BadRequestError('User not authenticated');

  const body = await req.json();
  const validation = claimSchema.safeParse(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  try {
    const result = await targetService.claimReward(user.id, validation.data.targetId);
    return successResponse(result, 'Reward claimed successfully');
  } catch (error: any) {
    throw new BadRequestError(error.message || 'Failed to claim reward');
  }
});
