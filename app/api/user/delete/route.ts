/**
 * DELETE /api/user/delete
 * Authenticated endpoint — immediately schedules (or performs) full account deletion
 * for the currently logged-in user. Called from the mobile app.
 *
 * Strategy: anonymise + soft-delete rather than hard purge so that regulatory records
 * (CBN / EFCC) required for financial audit are not removed, while all PII is erased.
 */

import { apiHandler, getAuthenticatedUser, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'
import { logger } from '@/lib/logger'

export const DELETE = apiHandler(async (request: Request) => {
  const user = await getAuthenticatedUser(request)

  // Verify the account has no pending/in-progress transactions that could leave funds in limbo
  const pendingTx = await prisma.transaction.count({
    where: {
      userId: user.id,
      status: 'PENDING',
    },
  })

  if (pendingTx > 0) {
    throw Object.assign(
      new Error('You have pending transactions. Please wait for them to complete before deleting your account.'),
      { statusCode: 409 }
    )
  }

  // Check wallet balance — require the user to withdraw funds first
  const wallet = await prisma.user.findUnique({
    where: { id: user.id },
    select: { credits: true, email: true, firstName: true, phone: true },
  })

  if (wallet && wallet.credits > 0) {
    throw Object.assign(
      new Error(`Your wallet has a balance of ₦${(wallet.credits / 100).toFixed(2)}. Please withdraw all funds before deleting your account.`),
      { statusCode: 409 }
    )
  }

  const userEmail = wallet?.email
  const userName = wallet?.firstName

  // Anonymise PII while preserving financial audit trail
  await prisma.$transaction(async (tx) => {
    // Anonymise personal data on the user record (keep ID + financial records intact)
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: `deleted_${user.id}@nillarpay.deleted`,
        phone: `deleted_${user.id}`,
        firstName: 'Deleted',
        lastName: 'User',
        passwordHash: null,
        pinHash: null,
        pushToken: null,
        isVerified: false,
        emailVerified: null,
        phoneVerified: false,
      },
    })

    // Revoke all active sessions
    await tx.session.deleteMany({ where: { userId: user.id } })

    // Remove OAuth account links
    await tx.account.deleteMany({ where: { userId: user.id } }).catch(() => {})

    // Remove notifications
    await tx.notification.deleteMany({ where: { userId: user.id } }).catch(() => {})
  })

  // Send farewell email
  if (userEmail) {
    await emailService.sendEmail({
      to: userEmail,
      subject: 'Your NillarPay account has been deleted',
      html: `
        <p>Hi ${userName || 'there'},</p>
        <p>Your NillarPay account has been successfully deleted. All personal data associated with your account has been removed.</p>
        <p>Transaction records may be retained for up to 7 years as required by Nigerian financial regulations.</p>
        <p>We're sorry to see you go. If you ever change your mind, you're welcome to create a new account at any time.</p>
        <p>Thank you for using NillarPay.<br/>The NillarPay Team</p>
      `,
      text: `Hi ${userName || 'there'},\n\nYour NillarPay account has been successfully deleted. All personal data has been removed.\n\nTransaction records may be retained for regulatory purposes.\n\nThank you,\nThe NillarPay Team`,
    }).catch((err) => {
      logger.error('Failed to send account deletion confirmation email:', err)
    })
  }

  return successResponse({ message: 'Your account has been permanently deleted.' })
})
