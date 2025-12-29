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
      type: mapTransactionType(transaction),
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
function mapTransactionType(transaction: any): string {
  const type = transaction.type;
  const details = transaction.details || {};

  switch (type) {
    case 'DATA_PURCHASE':
    case 'DATA':
      return 'data';
    case 'AIRTIME_PURCHASE':
    case 'AIRTIME':
      return 'airtime';
    case 'BILL_PAYMENT':
    case 'ELECTRICITY':
    case 'CABLE':
    case 'CABLE_TV':
    case 'WATER':
      return 'bill';
    case 'WALLET_FUNDING':
      return 'funding';
    case 'REFERRAL_BONUS':
      return 'referral';
    case 'CASHBACK':
      return 'cashback';
    case 'BONUS':
      return 'bonus';
    case 'P2P_TRANSFER':
      return details.type === 'CREDIT' ? 'received' : 'transfer';
    case 'CREDIT_PURCHASE':
      // Check amount? Usually debit if purchase
      return 'purchase';
    case 'BETTING':
    case 'EPINS':
      return 'purchase';
    default:
      // Fallback based on amount sign?
      // But usually amount is absolute in response if we don't sign it here?
      // route returns transaction.amount (which is signed in DB for deduct, positive for add)
      // Wait, WalletService deductBalance stores negative amount in DB.
      // So if amount is negative, it's a debit.
      // But logic in frontend utils maps string to CREDIT/DEBIT.
      return 'other';
  }
}

function mapTransactionStatus(status: string): 'pending' | 'completed' | 'failed' | 'cancelled' {
  switch (status) {
    case 'COMPLETED':
    case 'SUCCESS':
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

  // Use the stored description if available and robust
  if (details.description) {
    return details.description;
  }

  // Fallback generation
  switch (transaction.type) {
    case 'WALLET_FUNDING':
      return `Wallet funding - ${details.paymentMethod || 'Card'}`;
    case 'DATA_PURCHASE':
    case 'DATA':
      return `Data purchase - ${details.network || 'Unknown network'}`;
    case 'AIRTIME_PURCHASE':
    case 'AIRTIME':
      return `Airtime purchase - ${details.network || 'Unknown network'}`;
    case 'BILL_PAYMENT':
    case 'ELECTRICITY':
      return `Electricity - ${details.biller || 'Bill'}`;
    case 'CABLE':
    case 'CABLE_TV':
      return `Cable TV - ${details.biller || 'Subscription'}`;
    case 'REFERRAL_BONUS':
      return 'Referral bonus';
    case 'CASHBACK':
      return 'Cashback reward';
    case 'BONUS':
      return 'Bonus credit';
    case 'P2P_TRANSFER':
      return details.type === 'CREDIT'
        ? `Received from ${details.senderName || 'User'}`
        : `Transfer to ${details.recipientName || 'User'}`;
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