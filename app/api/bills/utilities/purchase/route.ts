import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'
import { purchaseService } from '@/lib/services/purchase.service'
import { ServiceType } from '@/lib/vendors/adapter.interface'

const purchaseSchema = z.object({
  type: z.string().min(1, 'Bill type is required'),
  provider: z.string().min(1, 'Provider is required'),
  customerInfo: z.record(z.any()),
  amount: z.number().min(1, 'Amount is required'),
  // Add support for plan/variation
  planId: z.string().optional(),
  variationCode: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, provider, customerInfo, amount, planId, variationCode } = purchaseSchema.parse(body)

    // Identify Service Type
    let serviceType: ServiceType = 'ELECTRICITY';
    if (type.toLowerCase() === 'cable' || type.toLowerCase() === 'cable_tv') {
        serviceType = 'CABLE'; 
    } else if (type.toLowerCase() === 'electricity') {
        serviceType = 'ELECTRICITY';
    } else {
        serviceType = 'ELECTRICITY';
    }

    // Extract recipient (customer ID)
    const recipient = customerInfo.meterNumber || customerInfo.smartCardNumber || customerInfo.phoneNumber || Object.values(customerInfo)[0];
    
    // For electricity, meter type might be needed
    const meterType = customerInfo.meterType;

    // Use purchase service
    try {
        const result = await purchaseService.purchase({
            userId: decoded.userId,
            service: serviceType,
            recipient: String(recipient),
            amount: amount,
            planId: planId || variationCode, // Need planId for Cable
            metadata: {
                provider, // 'IKEJA', 'DSTV' etc.
                meterType,
                ...customerInfo, // Spread rest
                source: 'web_app'
            }
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                transactionId: result.transaction.id,
                reference: result.transaction.reference,
                data: result.transaction
            });
        } else {
             return NextResponse.json(
                { error: result.message || 'Purchase failed' },
                { status: 400 }
            );
        }

    } catch (error: any) {
        console.error('Purchase service error:', error);
        return NextResponse.json(
            { error: error.message || 'Purchase failed' },
            { status: 500 }
        );
    }

  } catch (error) {
    console.error('Bill payment error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}