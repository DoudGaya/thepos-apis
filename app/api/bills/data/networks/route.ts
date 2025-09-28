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

    // Mock data networks with plans
    const networks = [
      {
        id: 'mtn',
        name: 'MTN',
        code: 'MTN',
        logo: 'https://example.com/mtn-logo.png',
        isActive: true
      },
      {
        id: 'airtel',
        name: 'Airtel',
        code: 'AIRTEL',
        logo: 'https://example.com/airtel-logo.png',
        isActive: true
      },
      {
        id: 'glo',
        name: 'Glo',
        code: 'GLO',
        logo: 'https://example.com/glo-logo.png',
        isActive: true
      },
      {
        id: '9mobile',
        name: '9mobile',
        code: '9MOBILE',
        logo: 'https://example.com/9mobile-logo.png',
        isActive: true
      }
    ];

    return NextResponse.json(networks);

  } catch (error) {
    console.error('Data networks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}