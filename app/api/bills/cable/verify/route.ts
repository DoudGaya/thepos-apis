import { apiHandler } from '@/lib/api-handler';
import { purchaseService } from '@/lib/services/PurchaseService';
import { successResponse } from '@/lib/api-response';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors';

const verifySmartCardSchema = z.object({
  provider: z.enum(['DSTV', 'GOTV', 'STARTIMES']),
  smartCardNumber: z.string().min(10, 'Invalid smart card number'),
});

export const POST = apiHandler(async (req) => {
  const body = await req.json();
  const validation = verifySmartCardSchema.safeParse(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const { provider, smartCardNumber } = validation.data;

  try {
    const result = await purchaseService.verifySmartCard(provider, smartCardNumber);

    if (!result.success || !result.data) {
      throw new BadRequestError(result.message || 'Verification failed');
    }

    return successResponse({
      customerName: result.data.customerName,
      customerNumber: smartCardNumber,
      currentBouquet: result.data.currentBouquet,
      currentBouquetCode: result.data.currentBouquetCode,
      renewalAmount: result.data.renewalAmount,
      dueDate: result.data.dueDate,
      status: result.data.status || 'ACTIVE',
    }, 'Smart card verification successful');

  } catch (error: any) {
    throw new BadRequestError(error.message || 'Smart card verification failed');
  }
});
