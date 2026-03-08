/**
 * POST /api/user/delete-request
 * Public (unauthenticated) endpoint — accepts account deletion requests submitted via the web form.
 * Sends an internal notification email to the support team.
 */

import { NextResponse } from 'next/server'
import { emailService } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, reason } = body

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number or email address is required.' },
        { status: 400 }
      )
    }

    const clean = identifier.trim().toLowerCase()

    // Check if the identifier matches any user account (best-effort — do not reveal if found)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: clean },
          { phone: clean },
          { phone: identifier.trim() },
        ],
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    }).catch(() => null) // never fail the request on DB error

    // Notify the support team
    const adminEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER
    if (adminEmail) {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `[NillarPay] Account Deletion Request — ${clean}`,
        html: `
          <h2>Account Deletion Request</h2>
          <p><strong>Submitted identifier:</strong> ${clean}</p>
          ${user ? `<p><strong>Matched user:</strong> ${user.firstName} ${user.lastName} (ID: ${user.id}, email: ${user.email})</p>` : '<p><em>No matching account found — manual verification required.</em></p>'}
          ${reason ? `<p><strong>Reason:</strong> ${reason.trim()}</p>` : ''}
          <p><strong>Submitted at:</strong> ${new Date().toISOString()}</p>
          <hr />
          <p style="font-size:12px;color:#666">
            Please process this deletion request within 30 days. 
            If a wallet balance exists, follow the refund procedure before deletion.
          </p>
        `,
        text: `Account Deletion Request\n\nIdentifier: ${clean}\n${user ? `Matched user: ${user.firstName} ${user.lastName} (ID: ${user.id})` : 'No matching account found.'}\n${reason ? `Reason: ${reason.trim()}\n` : ''}Submitted at: ${new Date().toISOString()}`,
      }).catch((err) => {
        logger.error('Failed to send deletion request notification email:', err)
      })
    }

    // Optionally send confirmation to the user (if we found a matching email)
    if (user?.email) {
      await emailService.sendEmail({
        to: user.email,
        subject: 'NillarPay — Account Deletion Request Received',
        html: `
          <p>Hi ${user.firstName},</p>
          <p>We have received your request to delete your NillarPay account and all associated data.</p>
          <p>Our team will process this request within <strong>30 days</strong>. 
             You will receive a confirmation once the deletion is complete.</p>
          <p>If you did not make this request, please contact us immediately at 
             <a href="mailto:support@nillar.com">support@nillar.com</a>.</p>
          <p>Thank you,<br/>The NillarPay Team</p>
        `,
        text: `Hi ${user.firstName},\n\nWe have received your request to delete your NillarPay account. Our team will process it within 30 days.\n\nIf you did not make this request, contact support@nillar.com immediately.\n\nThank you,\nThe NillarPay Team`,
      }).catch((err) => {
        logger.error('Failed to send deletion confirmation email to user:', err)
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Your deletion request has been submitted. You will be contacted within 30 days.',
    })
  } catch (err) {
    logger.error('DELETE REQUEST error:', err)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
