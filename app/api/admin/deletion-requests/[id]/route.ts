import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status, adminNote } = body

  const updated = await prisma.deletionRequest.update({
    where: { id },
    data: {
      status,
      ...(adminNote !== undefined ? { adminNote } : {}),
      adminId: (session.user as any).id,
    },
    include: {
      user: { select: { id: true, firstName: true, email: true } },
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

// Execute the actual deletion/anonymisation for a specific request
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const deletionRequest = await prisma.deletionRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, credits: true } },
    },
  })

  if (!deletionRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (!deletionRequest.userId || !deletionRequest.user) {
    // No matched user — just mark as completed
    await prisma.deletionRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        adminId: (session.user as any).id,
        adminNote: 'No matching user found — marked complete.',
      },
    })
    return NextResponse.json({ success: true, message: 'Marked as completed (no matched user).' })
  }

  const { user } = deletionRequest

  // Anonymise PII while preserving financial audit trail
  await prisma.$transaction(async (tx) => {
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

    await tx.session.deleteMany({ where: { userId: user.id } })
    await tx.account.deleteMany({ where: { userId: user.id } }).catch(() => {})
    await tx.notification.deleteMany({ where: { userId: user.id } }).catch(() => {})

    await tx.deletionRequest.update({
      where: { id },
      data: { status: 'COMPLETED', adminId: (session.user as any).id },
    })
  })

  // Send farewell email
  if (user.email && !user.email.startsWith('deleted_')) {
    await emailService.sendEmail({
      to: user.email,
      subject: 'Your NillarPay account has been deleted',
      html: `<p>Hi ${user.firstName || 'there'},</p><p>Your NillarPay account has been successfully deleted per your request. All personal data has been removed.</p><p>Transaction records may be retained for up to 7 years as required by Nigerian financial regulations.</p><p>Thank you for using NillarPay.</p>`,
      text: `Your NillarPay account has been deleted. Personal data removed. Transaction records retained for regulatory compliance.`,
    }).catch((err) => logger.error('Failed to send deletion confirmation email:', err))
  }

  return NextResponse.json({
    success: true,
    message: 'Account anonymised and deletion request marked complete.',
  })
}
