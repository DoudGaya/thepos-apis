import { NextRequest, NextResponse } from 'next/server';
import { vendorService } from '@/lib/vendors';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const validateSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  // Allow dynamic fields but validate basic structure
  meterNumber: z.string().optional(),
  smartCardNumber: z.string().optional(),
  meterType: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // Check provider to determine service type
    const providerId = body.provider; // e.g. 'IKEJA', 'DSTV'
    
    // Determine service type based on provider (simple heuristic or lookup)
    let serviceType: 'ELECTRICITY' | 'CABLE' | null = null;
    
    // Providers lists (should match providers/route.ts)
    const electricityProviders = ['IKEJA', 'EKO', 'ABUJA', 'KANO', 'PORTHARCOURT', 'JOS', 'IBADAN', 'KADUNA', 'ENUGU', 'BENIN', 'ABA', 'YOLA'];
    const cableProviders = ['DSTV', 'GOTV', 'STARTIMES', 'SHOWMAX'];
    
    if (electricityProviders.includes(providerId)) {
      serviceType = 'ELECTRICITY';
    } else if (cableProviders.includes(providerId)) {
      serviceType = 'CABLE';
    } else {
      // Fallback or specific improved checking
       if (providerId.toLowerCase().includes('electric')) serviceType = 'ELECTRICITY';
       else if (['dstv', 'gotv', 'startimes', 'showmax'].includes(providerId.toLowerCase())) serviceType = 'CABLE';
    }

    if (!serviceType) {
      return NextResponse.json(
        { error: 'Unknown provider type' },
        { status: 400 }
      );
    }

    // Extract customer ID and meter type
    let customerId = body.meterNumber || body.smartCardNumber || body.phoneNumber;
    let meterType = body.meterType;

    if (!customerId) {
        // Fallback for generic dynamic fields
        const potentialKeys = Object.keys(body).filter(k => k !== 'provider' && k !== 'meterType');
        if (potentialKeys.length > 0) {
            customerId = body[potentialKeys[0]];
        } else {
             return NextResponse.json(
                { error: 'Customer ID (Meter Number or Smart Card Number) is required' },
                { status: 400 }
            );
        }
    }

    try {
      const result = await vendorService.verifyCustomer({
        customerId,
        service: serviceType,
        serviceProvider: providerId,
        meterType: meterType
      });

      if (result.isValid) {
        return NextResponse.json({
          success: true,
          data: {
            customerName: result.customerName,
            address: result.address,
            accountType: result.accountType,
            ...result.metadata
          }
        });
      } else {
        return NextResponse.json(
          { error: result.metadata?.error || 'Invalid Customer ID' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      return NextResponse.json(
        { error: error.message || 'Validation failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
