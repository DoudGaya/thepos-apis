/**
 * Admin Referral Withdrawal Requests API
 * GET  — List withdrawal requests with filters and pagination
 * PATCH — Approve or reject a specific request
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS } from '@/lib/rbac'
import {
  apiHandler,
  successResponse,
  requirePermission,
  getPaginationParams,
  parseQueryParams,
  validateRequestBody,
  BadRequestError,
  NotFoundError,
  createPaginatedResponse,
} from '@/lib/api-utils'

// ── Validation ──────────────────────────────────────────────────────────────

const patchSchema = z.object({
  id: z.string().min(1, 'Withdrawal request ID is required'),
  action: z.enum(['APPROVE', 'REJECT'], {
    errorMap: () => ({ message: 'Action must be APPROVE or REJECT' }),
  }),
  adminNote: z.string().max(500).optional(),
})

type PatchBody = z.infer<typeof patchSchema>

// ── GET ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/referrals/withdrawals
 * List all withdrawal requests with optional filters and pagination.
 */
export const GET = apiHandler(async (request: Request) => {
  await requirePermission(PERMISSIONS.REFERRALS_VIEW, request)

  const params = parseQueryParams(request.url)
  const status = params.getString('status')        // PENDING | APPROVED | REJECTED
  const search = params.getString('search')        // user name / email / account number
  const { limit, skip, page } = getPaginationParams(request.url, 20)

  const where: any = {}

  if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    where.status = status
  }

  if (search) {
    where.OR = [
      { accountNumber: { contains: search } },
      { accountName: { contains: search, mode: 'insensitive' } },
      { bankName: { contains: search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ]
  }

  const [total, requests] = await Promise.all([
    prisma.withdrawalRequest.count({ where }),
    prisma.withdrawalRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    }),
  ])

  return successResponse(
    createPaginatedResponse(requests, total, page, limit),
    'Withdrawal requests fetched successfully',
  )
})

// ── PATCH ────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/referrals/withdrawals
 * Approve or reject a withdrawal request.
 *
 * - APPROVE: leaves earnings WITHDRAWN (already locked), sends approval notification.
 * - REJECT:  reverts WITHDRAWN earnings back to PAID, sends rejection notification.
 */
export const PATCH = apiHandler(async (request: Request) => {
  await requirePermission(PERMISSIONS.REFERRALS_MANAGE, request)

  const data = (await validateRequestBody(request, patchSchema)) as PatchBody

  const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
    where: { id: data.id },
    include: { user: { select: { id: true, firstName: true } } },
  })

  if (!withdrawalRequest) {
    throw new NotFoundError('Withdrawal request not found')
  }

  if (withdrawalRequest.status !== 'PENDING') {
    throw new BadRequestError(
      `This request has already been ${withdrawalRequest.status.toLowerCase()}.`,
    )
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Update withdrawal request status
    const req = await tx.withdrawalRequest.update({
      where: { id: data.id },
      data: {
        status: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        adminNote: data.adminNote ?? null,
      },
    })

    if (data.action === 'REJECT') {
      // Revert locked earnings back to PAID so the user keeps their balance
      // We restore WITHDRAWN earnings chronologically up to the rejected amount
      const withdrawnEarnings = await tx.referralEarning.findMany({
        where: { userId: withdrawalRequest.userId, status: 'WITHDRAWN' },
        orderBy: { createdAt: 'desc' },
      })

      let remaining = withdrawalRequest.amount
      for (const earning of withdrawnEarnings) {
        if (remaining <= 0) break
        if (earning.amount <= remaining) {
          await tx.referralEarning.update({
            where: { id: earning.id },
            data: { status: 'PAID' },
          })
          remaining -= earning.amount
        }
      }

      // Notify user of rejection
      await tx.notification.create({
        data: {
          userId: withdrawalRequest.userId,
          title: 'Withdrawal Request Rejected',
          message: data.adminNote
            ? `Your withdrawal request of ₦${withdrawalRequest.amount.toLocaleString()} was rejected. Reason: ${data.adminNote}. Your balance has been restored.`
            : `Your withdrawal request of ₦${withdrawalRequest.amount.toLocaleString()} was rejected. Your balance has been restored. Please contact support if you have questions.`,
          type: 'TRANSACTION',
          isRead: false,
        },
      })
    } else {
      // Notify user of approval
      await tx.notification.create({
        data: {
          userId: withdrawalRequest.userId,
          title: 'Withdrawal Request Approved',
          message: `Your withdrawal request of ₦${withdrawalRequest.amount.toLocaleString()} has been approved. The funds will be sent to your ${withdrawalRequest.bankName} account (${withdrawalRequest.accountNumber}) within 2–5 business days.`,
          type: 'TRANSACTION',
          isRead: false,
        },
      })
    }

    return req
  })

  return successResponse(
    { request: updated },
    `Withdrawal request ${data.action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
  )
})
