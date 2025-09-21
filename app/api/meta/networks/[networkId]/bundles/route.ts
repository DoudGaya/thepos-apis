import { NextRequest, NextResponse } from 'next/server'

const dataBundles = {
  mtn: [
    { 
      id: 'mtn-1gb-30d', 
      networkId: 'mtn', 
      name: '1GB Data', 
      data: '1GB', 
      validity: '30 days', 
      price: 350, 
      originalPrice: 400,
      isActive: true, 
      category: 'monthly' as const 
    },
    { 
      id: 'mtn-2gb-30d', 
      networkId: 'mtn', 
      name: '2GB Data', 
      data: '2GB', 
      validity: '30 days', 
      price: 700, 
      originalPrice: 800,
      isActive: true, 
      category: 'monthly' as const 
    },
    { 
      id: 'mtn-5gb-30d', 
      networkId: 'mtn', 
      name: '5GB Data', 
      data: '5GB', 
      validity: '30 days', 
      price: 1500, 
      originalPrice: 1700,
      isActive: true, 
      category: 'monthly' as const 
    },
  ],
  airtel: [
    { 
      id: 'airtel-1gb-30d', 
      networkId: 'airtel', 
      name: '1GB Data', 
      data: '1GB', 
      validity: '30 days', 
      price: 340, 
      originalPrice: 390,
      isActive: true, 
      category: 'monthly' as const 
    },
    { 
      id: 'airtel-2gb-30d', 
      networkId: 'airtel', 
      name: '2GB Data', 
      data: '2GB', 
      validity: '30 days', 
      price: 680, 
      originalPrice: 780,
      isActive: true, 
      category: 'monthly' as const 
    },
  ],
  glo: [
    { 
      id: 'glo-1gb-30d', 
      networkId: 'glo', 
      name: '1GB Data', 
      data: '1GB', 
      validity: '30 days', 
      price: 350, 
      originalPrice: 400,
      isActive: true, 
      category: 'monthly' as const 
    },
  ],
  '9mobile': [
    { 
      id: '9mobile-1gb-30d', 
      networkId: '9mobile', 
      name: '1GB Data', 
      data: '1GB', 
      validity: '30 days', 
      price: 360, 
      originalPrice: 410,
      isActive: true, 
      category: 'monthly' as const 
    },
  ],
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ networkId: string }> }
) {
  try {
    const { networkId } = await params
    const bundles = dataBundles[networkId as keyof typeof dataBundles] || []
    
    return NextResponse.json(bundles)
  } catch (error) {
    console.error('Error fetching data bundles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data bundles' },
      { status: 500 }
    )
  }
}
