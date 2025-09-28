import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Get user's transaction history
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId: decoded.userId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get transactions with count
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    // Transform transactions to match frontend interface
    const transformedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: mapTransactionType(transaction.type),
      amount: transaction.amount,
      description: getTransactionDescription(transaction),
      status: mapTransactionStatus(transaction.status),
      reference: transaction.reference,
      date: transaction.createdAt.toISOString(),
      recipient: getRecipient(transaction),
      network: getNetwork(transaction),
      biller: getBiller(transaction),
      metadata: transaction.details,
    }));

    return NextResponse.json({
      data: transformedTransactions,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// Helper functions to map transaction data
function mapTransactionType(type: string): 'data' | 'bill' | 'topup' | 'referral' | 'cashback' | 'bonus' {
  switch (type) {
    case 'DATA_PURCHASE':
      return 'data';
    case 'BILL_PAYMENT':
      return 'bill';
    case 'WALLET_FUNDING':
      return 'topup';
    case 'REFERRAL_BONUS':
      return 'referral';
    case 'CASHBACK':
      return 'cashback';
    case 'BONUS':
      return 'bonus';
    default:
      return 'topup';
  }
}

function mapTransactionStatus(status: string): 'pending' | 'completed' | 'failed' | 'cancelled' {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'PENDING':
      return 'pending';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function getTransactionDescription(transaction: any): string {
  const details = transaction.details || {};
  
  switch (transaction.type) {
    case 'WALLET_FUNDING':
      return `Wallet funding - ${details.paymentMethod || 'Unknown method'}`;
    case 'DATA_PURCHASE':
      return `Data purchase - ${details.network || 'Unknown network'}`;
    case 'BILL_PAYMENT':
      return `Bill payment - ${details.biller || 'Unknown biller'}`;
    case 'REFERRAL_BONUS':
      return 'Referral bonus';
    case 'CASHBACK':
      return 'Cashback reward';
    case 'BONUS':
      return 'Bonus credit';
    default:
      return 'Transaction';
  }
}

function getRecipient(transaction: any): string | undefined {
  const details = transaction.details || {};
  return details.recipient || details.phoneNumber || details.accountNumber;
}

function getNetwork(transaction: any): string | undefined {
  const details = transaction.details || {};
  return details.network;
}

function getBiller(transaction: any): string | undefined {
  const details = transaction.details || {};
  return details.biller;
}