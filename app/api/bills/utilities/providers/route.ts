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

    // VTPass Providers for Electricity
    // Keys match VTPASS_SERVICE_IDS.ELECTRICITY in vtpass.adapter.ts
    const electricityProviders = [
      {
        id: 'IKEJA',
        name: 'Ikeja Electric Distribution Company',
        code: 'ikeja-electric',
        type: 'electricity',
        serviceId: 'IKEJA',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'EKO',
        name: 'Eko Electricity Distribution Company',
        code: 'eko-electric',
        type: 'electricity',
        serviceId: 'EKO',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'ABUJA',
        name: 'Abuja Electricity Distribution Company',
        code: 'abuja-electric',
        type: 'electricity',
        serviceId: 'ABUJA',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'KANO',
        name: 'Kano Electricity Distribution Company',
        code: 'kano-electric',
        type: 'electricity',
        serviceId: 'KANO',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'PORTHARCOURT',
        name: 'Port Harcourt Electricity Distribution Company',
        code: 'portharcourt-electric',
        type: 'electricity',
        serviceId: 'PORTHARCOURT',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'JOS',
        name: 'Jos Electricity Distribution Company',
        code: 'jos-electric',
        type: 'electricity',
        serviceId: 'JOS',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'IBADAN',
        name: 'Ibadan Electricity Distribution Company',
        code: 'ibadan-electric',
        type: 'electricity',
        serviceId: 'IBADAN',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'KADUNA',
        name: 'Kaduna Electricity Distribution Company',
        code: 'kaduna-electric',
        type: 'electricity',
        serviceId: 'KADUNA',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
      {
        id: 'ENUGU',
        name: 'Enugu Electricity Distribution Company',
        code: 'enugu-electric',
        type: 'electricity',
        serviceId: 'ENUGU',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      },
       {
        id: 'BENIN',
        name: 'Benin Electricity Distribution Company',
        code: 'benin-electric',
        type: 'electricity',
        serviceId: 'BENIN',
        fields: [
          {
            key: 'meterNumber',
            label: 'Meter Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 13
          },
          {
            key: 'meterType',
            label: 'Meter Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Prepaid', value: 'prepaid' },
              { label: 'Postpaid', value: 'postpaid' }
            ]
          }
        ]
      }
    ];

    // VTPass Providers for Cable
    const cableProviders = [
      {
        id: 'DSTV',
        name: 'DStv',
        code: 'dstv',
        type: 'cable',
        serviceId: 'DSTV',
        fields: [
          {
            key: 'smartCardNumber',
            label: 'Smart Card Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 11
          }
        ]
      },
      {
        id: 'GOTV',
        name: 'GOtv',
        code: 'gotv',
        type: 'cable',
        serviceId: 'GOTV',
        fields: [
          {
            key: 'smartCardNumber',
            label: 'IUC Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 11
          }
        ]
      },
      {
        id: 'STARTIMES',
        name: 'StarTimes',
        code: 'startimes',
        type: 'cable',
        serviceId: 'STARTIMES',
        fields: [
          {
            key: 'smartCardNumber',
            label: 'Smart Card Number',
            type: 'number',
            required: true,
            minLength: 10,
            maxLength: 11
          }
        ]
      },
      {
        id: 'SHOWMAX',
        name: 'Showmax',
        code: 'showmax',
        type: 'cable',
        serviceId: 'SHOWMAX',
        fields: [
           {
            key: 'phoneNumber',
            label: 'Phone Number',
            type: 'tel',
            required: true,
            minLength: 11,
            maxLength: 11
          }
        ]
      }
    ];

    const providers = {
      electricity: electricityProviders,
      cable: cableProviders,
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