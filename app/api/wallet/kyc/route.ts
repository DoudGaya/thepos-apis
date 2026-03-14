/**
 * POST /api/wallet/kyc
 * Saves the user's BVN or NIN for Monnify virtual account KYC.
 * Required by CBN regulation — mandatory since September 16 2024.
 *
 * Body: { bvn?: string, nin?: string }
 * At least one of bvn or nin must be provided.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { apiHandler, successResponse, getAuthenticatedUser } from '@/lib/api-utils'

const bodySchema = z
  .object({
    bvn: z.string().regex(/^\d{11}$/, 'BVN must be exactly 11 digits').optional(),
    nin: z.string().regex(/^\d{11}$/, 'NIN must be exactly 11 digits').optional(),
  })
  .refine((data) => data.bvn || data.nin, {
    message: 'Provide either a BVN or NIN',
  })

export const POST = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 422 }
    )
  }

  const { bvn, nin } = parsed.data

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(bvn ? { bvn } : {}),
      ...(nin ? { nin } : {}),
    },
  })

  return successResponse({ message: 'KYC details saved successfully' })
})
