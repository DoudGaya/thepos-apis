/**
 * GET /api/wallet/payment-options
 * Returns the list of enabled payment methods for wallet funding.
 * The enabled/disabled state is driven by the `payment_methods_config`
 * AppSetting record (managed from the admin settings page).
 *
 * Falls back to all methods enabled when the DB record does not exist yet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

/** Default configuration — all gateways available, monnify_va enabled by default */
const DEFAULT_CONFIG: Record<string, boolean> = {
  paystack: true,
  opay: true,
  nomba: true,
  monnify_va: true,
}

const METHOD_META: Record<
  string,
  {
    name: string
    description: string
    icon: string
    feeDescription: string
    feeFn: (amount: number) => number
  }
> = {
  paystack: {
    name: 'Card / Bank Transfer',
    description: 'Pay with debit card, bank transfer, USSD or mobile money',
    icon: 'card-outline',
    feeDescription: '1.5% + ₦100 (max ₦2,100)',
    feeFn: (amount: number) => Math.min(Math.ceil(amount * 0.015) + 100, 2100),
  },
  opay: {
    name: 'OPay',
    description: 'Pay instantly with OPay',
    icon: 'phone-portrait-outline',
    feeDescription: 'Free',
    feeFn: () => 0,
  },
  nomba: {
    name: 'Nomba',
    description: 'Pay with Nomba checkout',
    icon: 'business-outline',
    feeDescription: 'Free',
    feeFn: () => 0,
  },
  monnify_va: {
    name: 'Virtual Account',
    description: 'Transfer to your dedicated bank account — funds arrive instantly',
    icon: 'wallet-outline',
    feeDescription: 'Free',
    feeFn: () => 0,
  },
}

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const amount = parseFloat(searchParams.get('amount') || '0')

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
    }

    // Load enabled/disabled state from DB
    let enabledMap: Record<string, boolean> = { ...DEFAULT_CONFIG }
    try {
      const setting = await prisma.appSetting.findUnique({
        where: { key: 'payment_methods_config' },
      })
      if (setting?.value && typeof setting.value === 'object') {
        const stored = setting.value as Record<string, { enabled?: boolean }>
        for (const [id, val] of Object.entries(stored)) {
          if (typeof val?.enabled === 'boolean') {
            enabledMap[id] = val.enabled
          }
        }
      }
    } catch (err) {
      // Non-fatal — fall back to defaults
      console.warn('[payment-options] Failed to load AppSetting:', err)
    }

    const paymentOptions = Object.entries(METHOD_META)
      .filter(([id]) => enabledMap[id] === true)
      .map(([id, meta]) => ({
        id,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        enabled: true,
        fee: meta.feeFn(amount),
        feeDescription: meta.feeDescription,
      }))

    return NextResponse.json({ success: true, data: paymentOptions })
  } catch (error) {
    console.error('Get payment options error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}