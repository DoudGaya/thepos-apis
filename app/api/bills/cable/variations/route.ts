import { apiHandler } from '@/lib/api-handler';
import { purchaseService } from '@/lib/services/PurchaseService';
import { successResponse } from '@/lib/api-response';
import { BadRequestError } from '@/lib/errors';

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider');

  if (!provider) {
    throw new BadRequestError('Provider is required');
  }

  try {
    const result = await purchaseService.getCablePlans(provider);

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to fetch plans');
    }

    return successResponse(result.data, 'Cable plans retrieved successfully');
  } catch (error: any) {
    throw new BadRequestError(error.message || 'Failed to fetch plans');
  }
});
