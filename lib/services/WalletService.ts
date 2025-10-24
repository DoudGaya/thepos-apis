/**
 * WalletService - Simplified version using User.credits
 * Handles wallet operations with atomic transactions
 */

import { PrismaClient, TransactionStatus, TransactionType } from '@prisma/client';
import { prisma } from '../prisma';

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
}

export const walletService = new WalletService();
