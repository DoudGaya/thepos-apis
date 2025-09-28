import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';

// Get utilities providers
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

    // Mock utilities providers data
    const providers = {
      electricity: [
        {
          id: 'ekedc',
          name: 'Eko Electricity Distribution Company',
          code: 'ekedc',
          type: 'electricity',
          serviceId: 'ekedc'
        },
        {
          id: 'ikedc',
          name: 'Ikeja Electric Distribution Company',
          code: 'ikedc',
          type: 'electricity',
          serviceId: 'ikedc'
        },
        {
          id: 'aedc',
          name: 'Abuja Electricity Distribution Company',
          code: 'aedc',
          type: 'electricity',
          serviceId: 'aedc'
        },
        {
          id: 'phedc',
          name: 'Port Harcourt Electricity Distribution Company',
          code: 'phedc',
          type: 'electricity',
          serviceId: 'phedc'
        },
        {
          id: 'kaedc',
          name: 'Kaduna Electric Distribution Company',
          code: 'kaedc',
          type: 'electricity',
          serviceId: 'kaedc'
        }
      ],
      cable: [
        {
          id: 'dstv',
          name: 'DStv',
          code: 'dstv',
          type: 'cable',
          serviceId: 'dstv'
        },
        {
          id: 'gotv',
          name: 'GOtv',
          code: 'gotv',
          type: 'cable',
          serviceId: 'gotv'
        },
        {
          id: 'startimes',
          name: 'StarTimes',
          code: 'startimes',
          type: 'cable',
          serviceId: 'startimes'
        }
      ],
      water: [
        {
          id: 'lagoswater',
          name: 'Lagos Water Corporation',
          code: 'lagoswater',
          type: 'water',
          serviceId: 'lagoswater'
        },
        {
          id: 'abujawater',
          name: 'Abuja Water Board',
          code: 'abujawater',
          type: 'water',
          serviceId: 'abujawater'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: providers
    });

  } catch (error) {
    console.error('Get utilities providers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}