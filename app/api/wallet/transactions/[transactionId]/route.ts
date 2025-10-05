import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { transactionId } = await params;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: decoded.userId,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const response = transformTransaction(transaction);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get transaction details error:', error);
    const status = error instanceof JsonWebTokenError ? 401 : 500;
    const message = error instanceof JsonWebTokenError ? 'Invalid token' : 'Failed to fetch transaction details';
    return NextResponse.json({ error: message }, { status });
  }
}

function transformTransaction(transaction: any) {
  const details = transaction.details || {};

  return {
    id: transaction.id,
    type: mapTransactionType(transaction.type),
    amount: transaction.amount,
    status: mapTransactionStatus(transaction.status),
    description: getTransactionDescription(transaction),
    reference: transaction.reference,
    date: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    recipient: getRecipient(transaction),
    network: getNetwork(transaction),
    biller: getBiller(transaction),
    currency: details.currency || 'NGN',
    channel: details.channel || details.paymentChannel,
    paymentMethod: details.paymentMethod || details.channel,
    fee: details.fee || details.fees || 0,
    metadata: details,
    breakdown: {
      amount: transaction.amount,
      fee: details.fee || details.fees || 0,
      total: (transaction.amount || 0) + (details.fee || details.fees || 0),
    },
    timeline: buildTimeline(transaction),
  };
}

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

  switch (transaction.type) {
    case 'WALLET_FUNDING':
      return `Wallet funding - ${details.paymentMethod || 'Paystack'}`;
    case 'DATA_PURCHASE':
      return `Data purchase - ${details.network || 'Unknown network'}`;
    case 'BILL_PAYMENT':
      return `Bill payment - ${details.biller || 'Unknown biller'}`;
    case 'REFERRAL_BONUS':
      return 'Referral bonus credit';
    case 'CASHBACK':
      return 'Cashback reward';
    case 'BONUS':
      return 'Promotional bonus';
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

function buildTimeline(transaction: any) {
  const details = transaction.details || {};
  const timeline = [] as Array<{ label: string; timestamp: string }>;

  timeline.push({ label: 'Created', timestamp: transaction.createdAt.toISOString() });

  if (details.paystackWebhook?.processed_at) {
    timeline.push({ label: 'Webhook Processed', timestamp: details.paystackWebhook.processed_at });
  }

  if (details.manualVerificationAt) {
    timeline.push({ label: 'Manually Verified', timestamp: details.manualVerificationAt });
  }

  timeline.push({ label: 'Last Updated', timestamp: transaction.updatedAt.toISOString() });

  return timeline;
}
