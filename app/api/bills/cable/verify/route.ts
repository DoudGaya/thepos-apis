import { apiHandler } from '@/lib/api-handler';
import { vendorService } from '@/lib/vendors';
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
    const result = await vendorService.verifyCustomer({
      customerId: smartCardNumber,
      service: 'CABLE_TV',
      serviceProvider: provider,
    });

    if (!result.isValid) {
      throw new BadRequestError('Verification failed');
    }

    return successResponse({
      customerName: result.customerName,
      customerNumber: smartCardNumber,
      currentBouquet: result.metadata?.currentBouquet,
      currentBouquetCode: result.metadata?.currentBouquetCode,
      renewalAmount: result.metadata?.renewalAmount,
      dueDate: result.metadata?.dueDate,
      status: result.metadata?.status || 'ACTIVE',
    }, 'Smart card verification successful');

  } catch (error: any) {
    throw new BadRequestError(error.message || 'Smart card verification failed');
  }
});
