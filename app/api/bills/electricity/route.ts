/**
 * Electricity Purchase API
 * POST - Purchase electricity tokens for prepaid/postpaid meters
 */

import { z } from 'zod'
import { purchaseService } from '@/lib/services/PurchaseService'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
} from '@/lib/api-utils'

const electricityProviders = [
  'EKEDC', 'IKEDC', 'AEDC', 'PHED', 'JED', 'IBEDC', 'KAEDCO', 'KEDCO'
] as const;

const electricityPurchaseSchema = z.object({
  provider: z.enum(electricityProviders, {
    errorMap: () => ({ message: 'Invalid electricity provider' }),
  }),
  meterNumber: z.string().min(10, 'Invalid meter number'),
  meterType: z.enum(['prepaid', 'postpaid']).default('prepaid'),
  vendorCost: z.number().min(1000, 'Minimum amount is ₦1,000').max(100000, 'Maximum amount is ₦100,000'),
  customerName: z.string().optional(),
  customerAddress: z.string().optional(),
});

export const POST = apiHandler(async (req) => {
  const user = await getAuthenticatedUser()
  const body = await validateRequestBody(req, electricityPurchaseSchema)
  const { 
    provider, 
    meterNumber, 
    meterType, 
    vendorCost, 
    customerName, 
    customerAddress 
  } = body as z.infer<typeof electricityPurchaseSchema>

  try {
    const result = await purchaseService.purchaseElectricity({
      userId: user.id,
      disco: provider,
      meterNumber,
      meterType: meterType.toUpperCase() as 'PREPAID' | 'POSTPAID',
      amount: vendorCost,
      customerName,
      customerAddress
    });

    return successResponse({
      token: result.data?.token,
      reference: result.reference,
      ...result.data
    }, 'Electricity purchase successful');

  } catch (error: any) {
    if (error.message.includes('Insufficient balance')) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
})

