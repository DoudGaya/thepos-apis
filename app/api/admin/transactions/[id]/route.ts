/**
 * Admin Single Transaction API
 * GET  - Fetch a single transaction with full details
 * PATCH - Update transaction status/notes (admin override)
 */

import { prisma } from '@/lib/prisma'
import { PERMISSIONS } from '@/lib/rbac'
import {
  apiHandler,
  successResponse,
  requirePermission,
  NotFoundError,
} from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/transactions/:id
 * Returns full transaction detail including user info and related earnings
 */
export const GET = apiHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(PERMISSIONS.TRANSACTIONS_VIEW, request)
  const { id } = await params

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      referralEarnings: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          referredUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  })

  if (!transaction) {
    throw new NotFoundError('Transaction not found')
  }

  return successResponse({ transaction })
})

/**
 * PATCH /api/admin/transactions/:id
 * Allow admins to add notes or update status for dispute/manual resolution
 */
export const PATCH = apiHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission(PERMISSIONS.TRANSACTIONS_VIEW, request)
  const { id } = await params

  const body = await request.json()
  const { status, vendorStatus } = body

  const transaction = await prisma.transaction.findUnique({ where: { id } })
  if (!transaction) throw new NotFoundError('Transaction not found')

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(vendorStatus ? { vendorStatus } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  return successResponse({ transaction: updated })
})
