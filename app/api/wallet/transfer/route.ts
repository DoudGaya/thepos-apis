/**
 * Wallet Transfer API
 * POST - Transfer funds between users
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
  validateRequestBody,
  generateReference,
  BadRequestError,
  InsufficientBalanceError,
  NotFoundError,
} from '@/lib/api-utils'

// Transfer validation schema
const transferSchema = z.object({
  recipientEmail: z.string().email('Invalid email address'),
  amount: z.number().min(100, 'Minimum transfer amount is ₦100').max(500000, 'Maximum transfer amount is ₦500,000'),
  description: z.string().min(3, 'Description is required').max(200).optional(),
  pin: z.string().length(4, 'Transaction PIN must be 4 digits').optional(),
})

/**
 * POST /api/wallet/transfer
 * Transfer funds from sender to recipient
 */
export const POST = apiHandler(async (request: Request) => {
  const sender = await getAuthenticatedUser()
  const data = (await validateRequestBody(request, transferSchema)) as z.infer<typeof transferSchema>

  // Prevent self-transfer
  if (data.recipientEmail === sender.email) {
    throw new BadRequestError('Cannot transfer to yourself')
  }

  // Find recipient user
  const recipient = await prisma.user.findUnique({
    where: { email: data.recipientEmail },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      credits: true,
    },
  })

  if (!recipient) {
    throw new NotFoundError('Recipient not found')
  }

  // Get sender's current balance
  const senderData = await prisma.user.findUnique({
    where: { id: sender.id },
    select: { credits: true },
  })

  if (!senderData) {
    throw new NotFoundError('Sender not found')
  }

  // Check if sender has sufficient balance
  const transferFee = 0 // No transfer fee for now, can be implemented later
  const totalAmount = data.amount + transferFee

  if (senderData.credits < totalAmount) {
    throw new InsufficientBalanceError(
      `Insufficient balance. Available: ₦${senderData.credits.toLocaleString()}, Required: ₦${totalAmount.toLocaleString()}`
    )
  }

  // Generate unique references
  const transferReference = generateReference('TRANSFER')

  // Perform transfer in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Deduct from sender
    const updatedSender = await tx.user.update({
      where: { id: sender.id },
      data: {
        credits: {
          decrement: totalAmount,
        },
      },
    })

    // Credit recipient
    const updatedRecipient = await tx.user.update({
      where: { id: recipient.id },
      data: {
        credits: {
          increment: data.amount,
        },
      },
    })

    // Create transaction record for sender (debit)
    const senderTransaction = await tx.transaction.create({
      data: {
        userId: sender.id,
        type: 'CREDIT_PURCHASE', // Using valid transaction type
        amount: data.amount,
        status: 'COMPLETED',
        reference: `${transferReference}_OUT`,
        details: {
          transferType: 'TRANSFER_OUT',
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: `${recipient.firstName} ${recipient.lastName}`,
          transferFee,
          description: data.description || `Transfer to ${recipient.firstName} ${recipient.lastName}`,
        },
      },
    })

    // Create transaction record for recipient (credit)
    const recipientTransaction = await tx.transaction.create({
      data: {
        userId: recipient.id,
        type: 'CREDIT_PURCHASE', // Using valid transaction type
        amount: data.amount,
        status: 'COMPLETED',
        reference: `${transferReference}_IN`,
        details: {
          transferType: 'TRANSFER_IN',
          senderId: sender.id,
          senderEmail: sender.email,
          senderName: sender.name,
          description: data.description || `Transfer from ${sender.name || sender.email}`,
        },
      },
    })

    // Create notifications for both users
    await tx.notification.createMany({
      data: [
        {
          userId: sender.id,
          title: 'Transfer Sent',
          message: `You sent ₦${data.amount.toLocaleString()} to ${recipient.firstName} ${recipient.lastName}`,
          type: 'TRANSACTION',
          isRead: false,
        },
        {
          userId: recipient.id,
          title: 'Money Received',
          message: `You received ₦${data.amount.toLocaleString()} from ${sender.name || sender.email}`,
          type: 'TRANSACTION',
          isRead: false,
        },
      ],
    })

    return {
      senderTransaction,
      recipientTransaction,
      senderBalance: updatedSender.credits,
      recipientBalance: updatedRecipient.credits,
    }
  })

  return successResponse({
    transfer: {
      reference: transferReference,
      amount: data.amount,
      fee: transferFee,
      totalAmount,
      recipient: {
        email: recipient.email,
        name: `${recipient.firstName} ${recipient.lastName}`,
      },
      newBalance: result.senderBalance,
    },
    transaction: result.senderTransaction,
  }, 'Transfer completed successfully')
})
