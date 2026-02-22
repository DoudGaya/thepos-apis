/**
 * Cable TV Packages API
 * GET /api/bills/cable-tv/packages?provider=dstv
 * Returns available package variations for a cable TV provider via VTPass
 */

import { NextResponse } from 'next/server'
import { vendorService } from '@/lib/vendors'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider')

  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 })
  }

  try {
    const vtpassProvider = provider.toUpperCase()
    const plans = await vendorService.getPlans('CABLE_TV', vtpassProvider as any, 'VTPASS')

    // Map ServicePlan → the shape BillsScreen / vtuSlice expects
    const packages = plans.map(p => ({
      id: p.id,                        // variation_code
      name: p.name,
      price: p.price,
      customerPrice: p.faceValue ?? p.price,
      duration: p.validity ?? '',
      availability: p.isAvailable ? 'Available' : 'Unavailable',
    }))

    return NextResponse.json(packages, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900', // cache 15 min
      },
    })
  } catch (error: any) {
    console.error('[cable-tv/packages] Error:', error.message)
    return NextResponse.json({ error: error.message || 'Failed to fetch packages' }, { status: 500 })
  }
}
