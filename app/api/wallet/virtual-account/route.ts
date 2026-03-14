/**
 * GET /api/wallet/virtual-account
 * Returns the user's dedicated Monnify virtual bank account.
 * Creates one if it doesn't exist yet (when Monnify is configured).
 * Returns a stub response when Monnify is not yet configured.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  apiHandler,
  successResponse,
  getAuthenticatedUser,
} from '@/lib/api-utils'
import {
  isMonnifyConfigured,
  reserveVirtualAccount,
} from '@/lib/monnify'

export const GET = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)

  // 1. Check if the user already has a virtual account
  const existing = await prisma.virtualAccount.findUnique({
    where: { userId: user.id },
  })

  if (existing) {
    return successResponse({
      stubbed: false,
      accountNumber: existing.accountNumber,
      accountName: existing.accountName,
      bankName: existing.bankName,
      bankCode: existing.bankCode,
      accountReference: existing.accountReference,
      status: existing.status,
    })
  }

  // 2. If Monnify is not configured, return a stub
  if (!isMonnifyConfigured()) {
    return successResponse({
      stubbed: true,
      message: 'Virtual account coming soon. Check back shortly.',
    })
  }

  // 3. Fetch full user details for the reservation
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, firstName: true, lastName: true, bvn: true, nin: true },
  })

  if (!dbUser) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  // 4. KYC gate — Monnify requires BVN or NIN (CBN regulation, mandatory since Sept 16 2024)
  if (!dbUser.bvn && !dbUser.nin) {
    return successResponse({
      stubbed: true,
      requiresKYC: true,
      message: 'Please provide your BVN or NIN to activate your virtual account.',
    })
  }

  const customerName =
    `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() ||
    dbUser.email.split('@')[0]

  // 5. Reserve a virtual account via Monnify API
  const reserved = await reserveVirtualAccount({
    accountReference: `VA-${dbUser.id}`,
    accountName: customerName,
    customerEmail: dbUser.email,
    customerName,
    ...(dbUser.bvn ? { bvn: dbUser.bvn } : {}),
    ...(dbUser.nin ? { nin: dbUser.nin } : {}),
  })

  // 6. Use the first assigned bank account (Moniepoint)
  const bankAccount = reserved.accounts?.[0]
  if (!bankAccount) {
    return NextResponse.json(
      { success: false, error: 'No bank account returned from Monnify' },
      { status: 502 }
    )
  }

  // 7. Persist to database
  const virtualAccount = await prisma.virtualAccount.create({
    data: {
      userId: dbUser.id,
      accountReference: reserved.accountReference,
      bankName: bankAccount.bankName,
      bankCode: bankAccount.bankCode,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      reservationRef: reserved.reservationReference,
      status: reserved.status || 'ACTIVE',
      monnifyRaw: reserved as object,
    },
  })

  return successResponse({
    stubbed: false,
    accountNumber: virtualAccount.accountNumber,
    accountName: virtualAccount.accountName,
    bankName: virtualAccount.bankName,
    bankCode: virtualAccount.bankCode,
    accountReference: virtualAccount.accountReference,
    status: virtualAccount.status,
  })
})
