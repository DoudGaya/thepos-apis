/**
 * Cable TV Smartcard Verification API
 * POST /api/bills/cable-tv/verify
 * Verifies a smartcard number via VTPass before purchase
 */

import { NextResponse } from 'next/server'
import { vendorService } from '@/lib/vendors'
import { z } from 'zod'

const verifySchema = z.object({
  provider: z.string().min(1),        // 'dstv' | 'gotv' | 'startimes'
  smartcardNumber: z.string().min(10),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { provider, smartcardNumber } = verifySchema.parse(body)

    const vtpassProvider = provider.toUpperCase()

    const result = await vendorService.verifyCustomer({
      customerId: smartcardNumber,
      service: 'CABLE_TV',
      serviceProvider: vtpassProvider,
    })

    if (!result.isValid) {
      return NextResponse.json(
        { success: false, error: 'Smartcard verification failed' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          customer_name: result.customerName,
          status: result.metadata?.Status || result.metadata?.status || 'ACTIVE',
          current_bouquet: result.metadata?.Current_Bouquet || result.metadata?.current_bouquet,
          renewal_amount: result.metadata?.Renewal_Amount || result.metadata?.renewal_amount,
          due_date: result.metadata?.Due_Date || result.metadata?.due_date,
        },
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (error: any) {
    console.error('[cable-tv/verify] Error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    )
  }
}
