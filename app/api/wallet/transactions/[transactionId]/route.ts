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
    // Populate customerInfo for frontend compatibility
    customerInfo: {
      phone: details.phoneNumber || details.recipient || (details.metadata && (details.metadata.phoneNumber || details.metadata.recipient)),
      meterNumber: details.meterNumber || (details.metadata && details.metadata.meterNumber),
      name: details.customerName || details.accountName || (details.metadata && (details.metadata.customerName || details.metadata.accountName)),
      address: details.customerAddress || (details.metadata && details.metadata.customerAddress),
      token: details.token || (details.metadata && details.metadata.token),
      packageName: details.plan || details.planName || details.planCode || (details.metadata && (details.metadata.planCode || details.metadata.planName)),
      smartCardNumber: details.smartCardNumber || (details.metadata && details.metadata.smartCardNumber),
    },
  };
}

function mapTransactionType(type: string): 'data' | 'bill' | 'topup' | 'referral' | 'cashback' | 'bonus' {
  switch (type) {
    case 'DATA':
    case 'DATA_PURCHASE':
      return 'data';
    case 'AIRTIME':
    case 'BILL_PAYMENT':
    case 'ELECTRICITY':
    case 'CABLE_TV':
    case 'CABLE':
      return 'bill';
    case 'WALLET_FUNDING':
    case 'CREDIT_PURCHASE': // Refunds etc
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
  const metadata = details.metadata || {};
  // Check transaction.network first (top-level field from API), then fallback to details
  const network = transaction.network || details.network || metadata.network || 'Unknown network';
  const biller = transaction.vendorName || details.biller || details.disco || details.provider || metadata.disco || metadata.provider || 'Unknown biller';
  const paymentMethod = details.paymentMethod || metadata.paymentMethod || 'Paystack';

  switch (transaction.type) {
    case 'WALLET_FUNDING':
      return `Wallet funding - ${paymentMethod}`;
    case 'DATA':
    case 'DATA_PURCHASE':
      return `Data purchase - ${network}`;
    case 'AIRTIME':
      return `Airtime purchase - ${network}`;
    case 'ELECTRICITY':
    case 'CABLE_TV':
    case 'CABLE':
    case 'BILL_PAYMENT':
      return `Bill payment - ${biller}`;
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
  const metadata = details.metadata || {};
  return details.recipient || details.phoneNumber || details.accountNumber || metadata.phoneNumber || metadata.recipient;
}

function getNetwork(transaction: any): string | undefined {
  const details = transaction.details || {};
  const metadata = details.metadata || {};
  return transaction.network || details.network || metadata.network;
}

function getBiller(transaction: any): string | undefined {
  const details = transaction.details || {};
  const metadata = details.metadata || {};
  return details.biller || details.disco || details.provider || metadata.disco || metadata.provider;
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
