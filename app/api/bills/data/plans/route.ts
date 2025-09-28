import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';

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

    // Get network parameter
    const { searchParams } = new URL(request.url);
    const networkCode = searchParams.get('network');

    if (!networkCode) {
      return NextResponse.json(
        { error: 'Network parameter is required' },
        { status: 400 }
      );
    }

    // Mock data bundles based on network
    const networkBundles: Record<string, any[]> = {
      MTN: [
        { id: 'mtn-1gb', networkId: 'mtn', name: '1GB Data', data: '1GB', amount: 500, validity: '30 days', description: '1GB for 30 days' },
        { id: 'mtn-2gb', networkId: 'mtn', name: '2GB Data', data: '2GB', amount: 1000, validity: '30 days', description: '2GB for 30 days' },
        { id: 'mtn-5gb', networkId: 'mtn', name: '5GB Data', data: '5GB', amount: 2000, validity: '30 days', description: '5GB for 30 days' },
        { id: 'mtn-10gb', networkId: 'mtn', name: '10GB Data', data: '10GB', amount: 3500, validity: '30 days', description: '10GB for 30 days' },
      ],
      AIRTEL: [
        { id: 'airtel-1.5gb', networkId: 'airtel', name: '1.5GB Data', data: '1.5GB', amount: 1000, validity: '30 days', description: '1.5GB for 30 days' },
        { id: 'airtel-3.5gb', networkId: 'airtel', name: '3.5GB Data', data: '3.5GB', amount: 2000, validity: '30 days', description: '3.5GB for 30 days' },
        { id: 'airtel-7gb', networkId: 'airtel', name: '7GB Data', data: '7GB', amount: 3500, validity: '30 days', description: '7GB for 30 days' },
        { id: 'airtel-15gb', networkId: 'airtel', name: '15GB Data', data: '15GB', amount: 7000, validity: '30 days', description: '15GB for 30 days' },
      ],
      GLO: [
        { id: 'glo-2.9gb', networkId: 'glo', name: '2.9GB Data', data: '2.9GB', amount: 1000, validity: '30 days', description: '2.9GB for 30 days' },
        { id: 'glo-5.8gb', networkId: 'glo', name: '5.8GB Data', data: '5.8GB', amount: 2000, validity: '30 days', description: '5.8GB for 30 days' },
        { id: 'glo-7.7gb', networkId: 'glo', name: '7.7GB Data', data: '7.7GB', amount: 2500, validity: '30 days', description: '7.7GB for 30 days' },
        { id: 'glo-10gb', networkId: 'glo', name: '10GB Data', data: '10GB', amount: 3000, validity: '30 days', description: '10GB for 30 days' },
      ],
      '9MOBILE': [
        { id: '9mobile-1.5gb', networkId: '9mobile', name: '1.5GB Data', data: '1.5GB', amount: 1000, validity: '30 days', description: '1.5GB for 30 days' },
        { id: '9mobile-4.5gb', networkId: '9mobile', name: '4.5GB Data', data: '4.5GB', amount: 2000, validity: '30 days', description: '4.5GB for 30 days' },
        { id: '9mobile-11gb', networkId: '9mobile', name: '11GB Data', data: '11GB', amount: 4000, validity: '30 days', description: '11GB for 30 days' },
        { id: '9mobile-15gb', networkId: '9mobile', name: '15GB Data', data: '15GB', amount: 5000, validity: '30 days', description: '15GB for 30 days' },
      ]
    };

    const bundles = networkBundles[networkCode.toUpperCase()] || [];

    if (bundles.length === 0) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(bundles);

  } catch (error) {
    console.error('Data plans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}