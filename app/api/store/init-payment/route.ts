
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import opayService from '@/lib/services/OpayService';
import { BadRequestError } from '@/lib/api-utils';

const initPaymentSchema = z.object({
    amount: z.number().min(50),
    email: z.string().email(),
    phoneNumber: z.string().optional(),
    name: z.string().optional(),
    callbackUrl: z.string().url().optional(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = initPaymentSchema.parse(body);

        console.log('🚀 Init Payment Request:', data);

        if (!opayService.isConfigured()) {
             return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 });
        }

        const reference = `QP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Default callback to current origin + /payment/callback if not provided
        // But we don't know origin easily in server unless from headers.
        // Let's assume the client sends the callbackUrl or we construct it.
        // For now, let's require client to send it or use a default env var.
        
        const callbackUrl = data.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/callback`;

        const paymentData = {
            reference,
            amount: data.amount * 100, // Convert to kobo
            currency: 'NGN',
            country: 'NG',
            userInfo: {
                userEmail: data.email,
                userId: data.email, // Use email as ID for guest checkout
                userMobile: data.phoneNumber || '',
                userName: data.name || 'Guest',
            },
            callbackUrl,
            returnUrl: callbackUrl, // OPay might use returnUrl for redirect
        };

        const response = await opayService.initializeWebPayment(paymentData);

        return NextResponse.json({
            authorization_url: response.data.cashierUrl || response.data.nextAction?.redirectUrl,
            reference,
            access_code: response.data.orderNo, // OPay uses orderNo
        });

    } catch (error: any) {
        console.error('Payment Init Error:', error);
        return NextResponse.json({ error: error.message || 'Payment initialization failed' }, { status: 500 });
    }
}
