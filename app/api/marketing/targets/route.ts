import { apiHandler } from '@/lib/api-handler';
import { targetService } from '@/lib/services/TargetService';
import { successResponse } from '@/lib/api-response';
import { BadRequestError } from '@/lib/errors';

export const GET = apiHandler(async (req) => {
  const user = req.user;
  if (!user) throw new BadRequestError('User not authenticated');

  const targets = await targetService.getUserTargets(user.id);
  return successResponse(targets, 'Targets retrieved successfully');
});
