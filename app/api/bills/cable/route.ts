import { apiHandler } from '@/lib/api-handler';
import { purchaseService } from '@/lib/services/PurchaseService';
import { successResponse } from '@/lib/api-response';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors';

const cablePurchaseSchema = z.object({
  provider: z.enum(['DSTV', 'GOTV', 'STARTIMES']),
  smartCardNumber: z.string().min(10, 'Invalid smart card number'),
  plan: z.string().min(1, 'Plan is required'),
  amount: z.number().positive('Amount must be positive'),
  customerName: z.string().optional(),
});

export const POST = apiHandler(async (req) => {
  const user = req.user;
  if (!user) {
    throw new BadRequestError('User not authenticated');
  }

  const body = await req.json();
  const validation = cablePurchaseSchema.safeParse(body);

  if (!validation.success) {
    throw new BadRequestError(validation.error.errors[0].message);
  }

  const { 
    provider, 
    smartCardNumber, 
    plan, 
    amount, 
    customerName 
  } = validation.data;

  try {
    const result = await purchaseService.purchaseCableTV({
      userId: user.id,
      provider,
      smartCardNumber,
      plan,
      amount,
      customerName
    });

    return successResponse({
      transactionId: result.transactionId,
      reference: result.reference,
      ...result.data
    }, 'Cable TV purchase successful');

  } catch (error: any) {
    if (error.message.includes('Insufficient balance')) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
});
