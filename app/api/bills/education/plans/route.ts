/**
 * Education Plans API
 * GET /api/bills/education/plans?examType=WAEC_RESULT|JAMB|WAEC_REG|NECO
 * Tries VTPass first, falls back to Monnify if VTPass returns no plans.
 */

import { NextResponse } from 'next/server'
import { vendorService } from '@/lib/vendors'

const EXAM_NETWORK_MAP: Record<string, string> = {
  WAEC_RESULT: 'WAEC',
  WAEC_REG:    'WAEC_REG',
  JAMB:        'JAMB',
  NECO:        'NECO',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const examType = (searchParams.get('examType') || '').toUpperCase()

  if (!examType || !EXAM_NETWORK_MAP[examType]) {
    return NextResponse.json(
      { error: `Invalid examType. Must be one of: ${Object.keys(EXAM_NETWORK_MAP).join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const network = EXAM_NETWORK_MAP[examType] as any

    // Try VTPass first
    let plans = await vendorService.getPlans('EDUCATION', network, 'VTPASS')
    let vendor = 'VTPASS'

    // Fall back to Monnify if VTPass has no plans for this exam type
    if (plans.length === 0) {
      try {
        const monnifyPlans = await vendorService.getPlans('EDUCATION', network, 'MONNIFY')
        if (monnifyPlans.length > 0) {
          plans = monnifyPlans
          vendor = 'MONNIFY'
        }
      } catch (mErr: any) {
        console.warn(`[education/plans] Monnify fallback failed for ${examType}:`, mErr.message)
      }
    }

    return NextResponse.json(
      plans.map(p => ({ id: p.id, name: p.name, price: p.price, vendor })),
      { headers: { 'Cache-Control': 'public, max-age=900' } }
    )
  } catch (error: any) {
    console.error('[education/plans] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch education plans' },
      { status: 500 }
    )
  }
}
