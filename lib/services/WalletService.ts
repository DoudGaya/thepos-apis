/**
 * WalletService - Simplified version using User.credits
 * Handles wallet operations with atomic transactions
 */

import { PrismaClient, TransactionStatus, TransactionType } from '@prisma/client';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export interface WalletTransactionData {
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  reference: string;
  serviceType?: string;
  metadata?: Record<string, any>;
}

export interface WalletBalance {
  available: number;
}

export class WalletService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  async getBalance(userId: string): Promise<WalletBalance> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { available: user.credits };
  }

  async addBalance(data: WalletTransactionData) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: data.userId },
        select: { credits: true },
      });

      if (!user) throw new Error('User not found');

      const balanceBefore = user.credits;
      const updatedUser = await tx.user.update({
        where: { id: data.userId },
        data: { credits: { increment: data.amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          type: data.type,
          status: TransactionStatus.SUCCESS,
          reference: data.reference,
          details: {
            description: data.description,
            serviceType: data.serviceType,
            metadata: data.metadata || {},
            balanceBefore,
            balanceAfter: updatedUser.credits,
          },
        },
      });

      return {
        wallet: { available: updatedUser.credits },
        transaction,
      };
    });
  }

  async deductBalance(data: WalletTransactionData) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: data.userId },
        select: { credits: true },
      });

      if (!user) throw new Error('User not found');
      if (user.credits < data.amount) throw new Error('Insufficient wallet balance');

      const balanceBefore = user.credits;
      const updatedUser = await tx.user.update({
        where: { id: data.userId },
        data: { credits: { decrement: data.amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: data.userId,
          amount: -data.amount,
          type: data.type,
          status: TransactionStatus.SUCCESS,
          reference: data.reference,
          details: {
            description: data.description,
            serviceType: data.serviceType,
            metadata: data.metadata || {},
            balanceBefore,
            balanceAfter: updatedUser.credits,
          },
        },
      });

      return {
        wallet: { available: updatedUser.credits },
        transaction,
      };
    });
  }

  async refundBalance(userId: string, originalTransactionId: string, reason: string) {
    return await this.prisma.$transaction(async (tx) => {
      const originalTx = await tx.transaction.findUnique({
        where: { id: originalTransactionId },
      });

      if (!originalTx) throw new Error('Original transaction not found');
      if (originalTx.userId !== userId) throw new Error('Transaction does not belong to user');
      if (originalTx.amount >= 0) throw new Error('Cannot refund a credit transaction');

      const refundAmount = Math.abs(originalTx.amount);
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) throw new Error('User not found');

      const balanceBefore = user.credits;
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: refundAmount } },
      });

      const originalDetails = originalTx.details as any;
      const refundTransaction = await tx.transaction.create({
        data: {
          userId,
          amount: refundAmount,
          type: TransactionType.CREDIT_PURCHASE,
          status: TransactionStatus.SUCCESS,
          reference: `REF-${originalTx.reference}`,
          details: {
            description: `Refund: ${reason}`,
            serviceType: originalDetails?.serviceType || 'REFUND',
            metadata: {
              originalTransactionId,
              reason,
              originalReference: originalTx.reference,
              isRefund: true,
            },
            balanceBefore,
            balanceAfter: updatedUser.credits,
          },
        },
      });

      await tx.transaction.update({
        where: { id: originalTransactionId },
        data: {
          status: TransactionStatus.FAILED,
          details: {
            ...(originalDetails || {}),
            refundedAt: new Date().toISOString(),
            refundTransactionId: refundTransaction.id,
            refundReason: reason,
          },
        },
      });

      return {
        wallet: { available: updatedUser.credits },
        refundTransaction,
      };
    });
  }

  async getTransactionHistory(userId: string, options: any = {}) {
    const { page = 1, limit = 20, type, status, startDate, endDate } = options;
    const where: any = { userId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async transferFunds(senderId: string, receiverId: string, amount: number, pin: string, note?: string) {
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { pinHash: true, credits: true }
    });

    if (!sender) throw new Error('Sender not found');
    if (!sender.pinHash) throw new Error('Transaction PIN not set');

    const isPinValid = await bcrypt.compare(pin, sender.pinHash);
    if (!isPinValid) throw new Error('Invalid PIN');

    if (sender.credits < amount) throw new Error('Insufficient funds');

    return await this.prisma.$transaction(async (tx) => {
      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: { credits: { decrement: amount } }
      });

      const updatedReceiver = await tx.user.update({
        where: { id: receiverId },
        data: { credits: { increment: amount } }
      });

      // @ts-ignore - Transfer model might not be in generated client yet
      const transfer = await tx.transfer.create({
        data: {
          senderId,
          receiverId,
          amount,
          status: 'COMPLETED',
          note
        }
      });

      await tx.transaction.create({
        data: {
          userId: senderId,
          type: 'P2P_TRANSFER' as TransactionType,
          amount: amount,
          status: TransactionStatus.SUCCESS,
          reference: `TRF-${transfer.id}-S`,
          details: {
            type: 'DEBIT',
            recipientId: receiverId,
            transferId: transfer.id,
            balanceBefore: sender.credits,
            balanceAfter: updatedSender.credits,
            note
          }
        }
      });

      await tx.transaction.create({
        data: {
          userId: receiverId,
          type: 'P2P_TRANSFER' as TransactionType,
          amount: amount,
          status: TransactionStatus.SUCCESS,
          reference: `TRF-${transfer.id}-R`,
          details: {
            type: 'CREDIT',
            senderId: senderId,
            transferId: transfer.id,
            balanceBefore: updatedReceiver.credits - amount,
            balanceAfter: updatedReceiver.credits,
            note
          }
        }
      });

      return transfer;
    });
  }

  async requestMoney(requesterId: string, payerId: string, amount: number, note?: string) {
    if (requesterId === payerId) throw new Error('Cannot request money from yourself');

    return await this.prisma.$transaction(async (tx) => {
      // @ts-ignore
      const moneyRequest = await tx.moneyRequest.create({
        data: {
          requesterId,
          payerId,
          amount,
          status: 'PENDING',
          note
        },
        include: {
          requester: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      });

      // Create notification for payer
      await tx.notification.create({
        data: {
          userId: payerId,
          title: 'Money Request',
          message: `${moneyRequest.requester.firstName || 'User'} requested ₦${amount}`,
          type: 'TRANSACTION',
          data: {
            type: 'MONEY_REQUEST',
            requestId: moneyRequest.id,
            amount: amount,
            requesterName: `${moneyRequest.requester.firstName} ${moneyRequest.requester.lastName}`,
          }
        }
      });

      return moneyRequest;
    });
  }

  async respondToRequest(userId: string, requestId: string, action: 'approve' | 'decline', pin?: string) {
    // @ts-ignore
    const request = await this.prisma.moneyRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
        payer: true
      }
    });

    if (!request) throw new Error('Request not found');
    if (request.payerId !== userId) throw new Error('Not authorized to respond to this request');
    if (request.status !== 'PENDING') throw new Error('Request already processed');

    if (action === 'decline') {
      // @ts-ignore
      const updatedRequest = await this.prisma.moneyRequest.update({
        where: { id: requestId },
        data: { status: 'DECLINED' }
      });

      await this.prisma.notification.create({
        data: {
          userId: request.requesterId,
          title: 'Request Declined',
          message: `${request.payer.firstName || 'User'} declined your request for ₦${request.amount}`,
          type: 'TRANSACTION',
          data: { requestId }
        }
      });

      return updatedRequest;
    }

    if (action === 'approve') {
      if (!pin) throw new Error('PIN is required to approve request');

      return await this.prisma.$transaction(async (tx) => {
        // Reuse transfer logic
        // We call the existing transferFunds logic but inside this transaction
        // Since transferFunds is an instance method and uses this.prisma.$transaction, 
        // we can't easily nest it unless we refactor transferFunds to accept a tx or duplicate logic.
        // For simplicity, we'll duplicate the transfer logic here but bind it to the request.

        const sender = await tx.user.findUnique({
          where: { id: userId },
          select: { pinHash: true, credits: true }
        });

        if (!sender) throw new Error('Sender not found');
        if (!sender.pinHash) throw new Error('Transaction PIN not set');

        const isPinValid = await bcrypt.compare(pin, sender.pinHash);
        if (!isPinValid) throw new Error('Invalid PIN');

        if (sender.credits < request.amount) throw new Error('Insufficient funds');

        // Update balances
        const updatedSender = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: request.amount } }
        });

        const updatedReceiver = await tx.user.update({
          where: { id: request.requesterId },
          data: { credits: { increment: request.amount } }
        });

        // Update Request Status
        // @ts-ignore
        const updatedRequest = await tx.moneyRequest.update({
          where: { id: requestId },
          data: { status: 'PAID' }
        });

        // Create Transfer Record
        // @ts-ignore
        const transfer = await tx.transfer.create({
          data: {
            senderId: userId,
            receiverId: request.requesterId,
            amount: request.amount,
            status: 'COMPLETED',
            note: request.note || 'Money Request Payment'
          }
        });

        // Create Transactions
        await tx.transaction.create({
          data: {
            userId: userId,
            type: 'P2P_TRANSFER' as TransactionType,
            amount: request.amount,
            status: TransactionStatus.SUCCESS,
            reference: `REQ-${requestId}-P`,
            details: {
              type: 'DEBIT',
              recipientId: request.requesterId,
              transferId: transfer.id,
              requestId: requestId,
              balanceBefore: sender.credits,
              balanceAfter: updatedSender.credits,
              note: request.note
            }
          }
        });

        await tx.transaction.create({
          data: {
            userId: request.requesterId,
            type: 'P2P_TRANSFER' as TransactionType,
            amount: request.amount,
            status: TransactionStatus.SUCCESS,
            reference: `REQ-${requestId}-R`,
            details: {
              type: 'CREDIT',
              senderId: userId,
              transferId: transfer.id,
              requestId: requestId,
              balanceBefore: updatedReceiver.credits - request.amount,
              balanceAfter: updatedReceiver.credits,
              note: request.note
            }
          }
        });

        // Notification for Requester
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            title: 'Request Paid',
            message: `${request.payer.firstName || 'User'} paid your request for ₦${request.amount}`,
            type: 'TRANSACTION',
            data: {
              type: 'PAYMENT_RECEIVED',
              requestId,
              amount: request.amount,
              payerName: `${request.payer.firstName} ${request.payer.lastName}`
            }
          }
        });

        return updatedRequest;
      }, {
        maxWait: 5000,
        timeout: 20000
      });
    }

    throw new Error('Invalid action');
  }
  async getRequests(userId: string, options: any = {}) {
    const { page = 1, limit = 20, type = 'all', status } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { requesterId: userId },
        { payerId: userId }
      ]
    };

    if (type === 'sent') {
      where.requesterId = userId;
      delete where.OR; // Override OR if specific type
    } else if (type === 'received') {
      where.payerId = userId;
      delete where.OR;
    }

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      // @ts-ignore
      this.prisma.moneyRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          requester: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true }
          },
          payer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true }
          }
        }
      }),
      // @ts-ignore
      this.prisma.moneyRequest.count({ where })
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

export const walletService = new WalletService();
