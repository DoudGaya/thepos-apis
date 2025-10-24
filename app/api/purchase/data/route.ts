/**
 * API Route: Purchase Data (Amigo)
 * 
 * Endpoint: POST /api/purchase/data
 * 
 * Handles data bundle purchases using the vendor service with automatic failover.
 * Supports all vendors including Amigo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { purchaseService } from '@/lib/services/purchase.service'
import { z } from 'zod'

// Request validation schema
const DataPurchaseSchema = z.object({
  network: z.enum(['MTN', 'GLO', 'AIRTEL', '9MOBILE']),
  recipient: z.string().min(10).max(15), // Phone number
  planId: z.string(), // Plan ID from vendor
  idempotencyKey: z.string().optional(), // Optional UUID
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'unauthorized', message: 'Please login to continue' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = DataPurchaseSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'validation_error',
          message: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { network, recipient, planId, idempotencyKey } = validation.data

    // 3. Process purchase through purchase service
    // The purchase service will automatically:
    // - Validate user balance
    // - Calculate pricing with profit margins
    // - Deduct wallet atomically
    // - Try vendors in priority order (VTU.NG → eBills → ClubKonnect → Amigo)
    // - Auto-refund on failure
    const result = await purchaseService.purchase({
      userId: session.user.id,
      service: 'DATA',
      network,
      recipient,
      planId,
      idempotencyKey,
      metadata: {
        source: 'web_app',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    // 4. Return response
    return NextResponse.json(
      {
        success: result.success,
        transaction: result.transaction,
        receipt: result.receipt,
        message: result.message,
      },
      { status: result.success ? 200 : 400 }
    )

  } catch (error: any) {
    console.error('[API /purchase/data] Error:', error)

    // Handle specific error types
    if (error.message?.includes('Insufficient balance')) {
      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_balance',
          message: error.message,
        },
        { status: 400 }
      )
    }

    if (error.message?.includes('Plan not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'plan_not_found',
          message: error.message,
        },
        { status: 404 }
      )
    }

    if (error.message?.includes('User not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'user_not_found',
          message: 'User account not found',
        },
        { status: 404 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: 'purchase_failed',
        message: error.message || 'Failed to process purchase',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/purchase/data
 * 
 * Get available data plans for all networks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network') as 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE' | null

    // Import vendor service
    const { vendorService } = await import('@/lib/vendors')

    // Get plans
    const plans = await vendorService.getPlans('DATA', network || undefined)

    // Group by network for easier frontend consumption
    const groupedPlans = plans.reduce((acc, plan) => {
      if (!acc[plan.network]) {
        acc[plan.network] = []
      }
      acc[plan.network].push({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        validity: plan.validity,
        network: plan.network,
        isAvailable: plan.isAvailable,
      })
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      success: true,
      plans: network ? plans : groupedPlans,
      totalPlans: plans.length,
    })

  } catch (error: any) {
    console.error('[API /purchase/data GET] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'fetch_plans_failed',
        message: error.message || 'Failed to fetch plans',
      },
      { status: 500 }
    )
  }
}
