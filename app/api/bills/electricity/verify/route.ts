import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { purchaseService } from '@/lib/services/PurchaseService'
import { z } from 'zod'

const verifySchema = z.object({
  disco: z.string(),
  meterNumber: z.string().min(10),
  meterType: z.enum(['PREPAID', 'POSTPAID']),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { disco, meterNumber, meterType } = verifySchema.parse(body)

    const result = await purchaseService.verifyMeter(disco, meterNumber, meterType)

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data })
    } else {
      return NextResponse.json({ success: false, error: result.error || 'Verification failed' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 })
  }
}
