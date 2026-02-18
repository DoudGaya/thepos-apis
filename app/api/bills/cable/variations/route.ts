import { apiHandler } from '@/lib/api-handler';import { vendorService } from '@/lib/vendors';
import { successResponse } from '@/lib/api-response';
import { BadRequestError } from '@/lib/errors';

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');

  if (!provider) {
    throw new BadRequestError('Provider is required');
  }

  try {
    const result = await vendorService.getPlans('CABLE_TV', provider as any);

    return successResponse(result, 'Cable plans retrieved successfully');
  } catch (error: any) {
    throw new BadRequestError(error.message || 'Failed to fetch plans');
  }
});
