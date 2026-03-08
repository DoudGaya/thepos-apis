/**
 * GET /api/referrals/public/[code]
 * Unauthenticated endpoint — returns only the referrer's first name so the
 * mobile landing screen can display a personalised invitation message.
 * No sensitive user data is exposed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { referralCode: code.toUpperCase() },
    select: { firstName: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Referral code not found' }, { status: 404 })
  }

  return NextResponse.json({ firstName: user.firstName ?? 'A friend' })
}
