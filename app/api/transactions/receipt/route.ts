import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    // Get transaction details
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: decoded.userId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          }
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const receiptData = {
      transaction: {
        id: transaction.id,
        reference: transaction.reference,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        details: transaction.details,
      },
      user: {
        name: `${transaction.user.firstName} ${transaction.user.lastName}`,
        phone: transaction.user.phone,
        email: transaction.user.email,
      },
      company: {
        name: 'NillarPay',
        phone: '+234 (0) 809 123 4567',
        email: 'support@NillarPay.ng',
        address: 'Lagos, Nigeria',
        website: 'www.NillarPay.ng',
      },
      timestamp: new Date().toISOString(),
      shareMessage: `NillarPay Transaction Receipt\n\nReference: ${transaction.reference}\nType: ${transaction.type.replace('_', ' ')}\nAmount: ₦${transaction.amount.toLocaleString()}\nStatus: ${transaction.status}\nDate: ${new Date(transaction.createdAt).toLocaleDateString('en-NG')}\n\nThank you for using NillarPay!\nwww.NillarPay.ng`,
    };

    return NextResponse.json(receiptData);
  } catch (error) {
    console.error('Receipt generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}
