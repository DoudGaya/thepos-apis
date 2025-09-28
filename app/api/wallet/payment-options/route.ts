import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import paystackService from '../../../../lib/paystack';

// Get payment options
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const amount = parseFloat(searchParams.get('amount') || '0');
    const email = searchParams.get('email') || '';

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Return payment options for the amount
    const paymentOptions = {
      card: {
        id: 'card',
        name: 'Card Payment',
        description: 'Pay with debit/credit card',
        icon: 'card-outline',
        enabled: true,
        fee: Math.min(Math.ceil(amount * 0.015), 2000) + 100, // 1.5% capped at ₦2000 + ₦100
        feeDescription: '1.5% + ₦100 (max ₦2100)',
      },
      bank_transfer: {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Transfer from your bank account',
        icon: 'business-outline',
        enabled: true,
        fee: 50,
        feeDescription: 'Flat ₦50',
        details: {
          account_number: '0123456789',
          account_name: 'ThePOS Wallet Funding',
          bank_name: 'Paystack Titan Bank',
          reference_note: 'Use your phone number as reference'
        }
      },
      ussd: {
        id: 'ussd',
        name: 'USSD',
        description: 'Dial USSD code on your phone',
        icon: 'phone-portrait-outline',
        enabled: true,
        fee: 0,
        feeDescription: 'Free',
        codes: {
          'Access Bank': '*901#',
          'GTBank': '*737#', 
          'First Bank': '*894#',
          'UBA': '*919#',
          'Zenith Bank': '*966#',
          'Sterling Bank': '*822#',
        }
      },
      mobile_money: {
        id: 'mobile_money',
        name: 'Mobile Money',
        description: 'Pay with mobile money',
        icon: 'phone-portrait-outline',
        enabled: true,
        fee: 25,
        feeDescription: 'Flat ₦25',
        providers: ['MTN MoMo', 'Airtel Money']
      }
    };

    return NextResponse.json({
      success: true,
      data: paymentOptions
    });

  } catch (error) {
    console.error('Get payment options error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}