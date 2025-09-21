import { NextResponse } from 'next/server'

const networks = [
  { 
    id: 'mtn', 
    name: 'MTN', 
    code: 'MTN',
    logo: 'https://logo.clearbit.com/mtn.com',
    isActive: true
  },
  { 
    id: 'airtel', 
    name: 'Airtel', 
    code: 'AIRTEL',
    logo: 'https://logo.clearbit.com/airtel.com',
    isActive: true
  },
  { 
    id: 'glo', 
    name: 'Glo', 
    code: 'GLO',
    logo: 'https://logo.clearbit.com/gloworld.com',
    isActive: true
  },
  { 
    id: '9mobile', 
    name: '9mobile', 
    code: '9MOBILE',
    logo: 'https://logo.clearbit.com/9mobile.com.ng',
    isActive: true
  },
]

export async function GET() {
  try {
    return NextResponse.json(networks)
  } catch (error) {
    console.error('Error fetching networks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch networks' },
      { status: 500 }
    )
  }
}
