import { NextRequest, NextResponse } from 'next/server';
import { vendorService } from '@/lib/vendors';
import { verifyToken } from '@/lib/auth';
import { ServiceType, NetworkType } from '@/lib/vendors/adapter.interface';

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

    // Get Query Params
    const url = new URL(request.url);
    const service = url.searchParams.get('service');
    const provider = url.searchParams.get('provider');

    if (!service || !provider) {
        return NextResponse.json(
            { error: 'Service and Provider are required' },
            { status: 400 }
        );
    }

    // Map service to ServiceType
    let serviceType: ServiceType = 'CABLE'; 
    if (service.toUpperCase() === 'CABLE' || service.toUpperCase() === 'CABLE_TV') serviceType = 'CABLE';
    else if (service.toUpperCase() === 'DATA') serviceType = 'DATA';
    else {
         return NextResponse.json(
            { error: 'Invalid service type' },
            { status: 400 }
        );
    }

    // Map provider to NetworkType
    // provider is expected to be 'DSTV', 'GOTV', 'MTN', etc.
    const networkType = provider.toUpperCase() as NetworkType;

    try {
        const plans = await vendorService.getPlans(serviceType, networkType);
        
        return NextResponse.json({
            success: true,
            data: plans
        });

    } catch (error: any) {
         console.error('Fetch plans error:', error);
         return NextResponse.json(
            { error: error.message || 'Failed to fetch plans' },
            { status: 500 }
        );
    }

  } catch (error) {
    console.error('Proviers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
