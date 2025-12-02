/**
 * Wallet Transfer API
 * POST - Transfer funds between users
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { walletService } from '@/lib/services/WalletService'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  BadRequestError,
  NotFoundError,
} from '@/lib/api-utils'

// Transfer validation schema
const transferSchema = z.object({
  recipientEmail: z.string().email('Invalid email address').optional(),
  recipientPhone: z.string().optional(),
  recipientId: z.string().optional(),
  amount: z.number().min(100, 'Minimum transfer amount is ₦100').max(500000, 'Maximum transfer amount is ₦500,000'),
  description: z.string().min(3, 'Description is required').max(200).optional(),
  pin: z.string().length(4, 'Transaction PIN must be 4 digits'),
})

/**
 * POST /api/wallet/transfer
 * Transfer funds from sender to recipient
 */
export const POST = apiHandler(async (request: Request) => {
  const sender = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, transferSchema)) as z.infer<typeof transferSchema>

  // Resolve recipient
  let recipient;
  if (data.recipientId) {
    recipient = await prisma.user.findUnique({ where: { id: data.recipientId } });
  } else if (data.recipientEmail) {
    recipient = await prisma.user.findUnique({ where: { email: data.recipientEmail } });
  } else if (data.recipientPhone) {
    recipient = await prisma.user.findUnique({ where: { phone: data.recipientPhone } });
  } else {
    throw new BadRequestError('Recipient identifier (email, phone, or ID) is required');
  }

  if (!recipient) {
    throw new NotFoundError('Recipient not found')
  }

  // Prevent self-transfer
  if (recipient.id === sender.id) {
    throw new BadRequestError('Cannot transfer to yourself')
  }

  // Use WalletService to perform the transfer
  try {
    const result = await walletService.transferFunds(
      sender.id,
      recipient.id,
      data.amount,
      data.pin,
      data.description
    );

    return successResponse({
      transfer: result,
      recipient: {
        email: recipient.email,
        name: `${recipient.firstName} ${recipient.lastName}`,
      },
    }, 'Transfer completed successfully')
  } catch (error: any) {
    // Map service errors to API errors
    if (error.message === 'Invalid PIN') {
      throw new BadRequestError('Invalid Transaction PIN');
    }
    if (error.message === 'Insufficient funds') {
      throw new BadRequestError('Insufficient wallet balance');
    }
    throw error;
  }
})

