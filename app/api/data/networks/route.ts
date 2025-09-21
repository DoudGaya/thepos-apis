import { NextResponse } from 'next/server'

const networks = [
  { id: 'mtn', name: 'MTN', code: 'MTN' },
  { id: 'airtel', name: 'Airtel', code: 'AIRTEL' },
  { id: 'glo', name: 'Glo', code: 'GLO' },
  { id: '9mobile', name: '9mobile', code: '9MOBILE' },
]

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: networks,
    })
  } catch (error) {
    console.error('Error fetching networks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch networks' },
      { status: 500 }
    )
  }
}
