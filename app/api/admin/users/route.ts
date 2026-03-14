/**
 * Admin User Management API
 * GET - List all users with filters
 */

import { prisma } from '@/lib/prisma'
import { PERMISSIONS } from '@/lib/rbac'
import {
  apiHandler,
  successResponse,
  requirePermission,
  getPaginationParams,
  parseQueryParams,
} from '@/lib/api-utils'

/**
 * GET /api/admin/users
 * List all users with search and filters
 */
export const GET = apiHandler(async (request: Request) => {
  await requirePermission(PERMISSIONS.USERS_VIEW, request)
  
  const params = parseQueryParams(request.url)
  const search = params.getString('search')
  const role = params.getString('role')
  const status = params.getString('status')
  const { limit, skip, page } = getPaginationParams(request.url, 20)

  // Build where clause
  const where: any = {}

  // Search in name, email, or phone
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Filter by role
  if (role && (role === 'USER' || role === 'ADMIN')) {
    where.role = role
  }

  // Filter by status (assuming we have an isActive field or use deletedAt)
  if (status === 'Suspended') {
    // Implement based on your schema - could be isActive: false or a suspension field
    // For now, we'll skip this or you can add a suspended field to the schema
  }

  // Fetch users with pagination
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        role: true,
        credits: true,
        referralCode: true,
        referredBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true,
            referrals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    }),
    prisma.user.count({ where }),
  ])

  // Enhance user data with additional stats
  const enhancedUsers = await Promise.all(
    users.map(async (user) => {
      // Get total spent
      const totalSpent = await prisma.transaction.aggregate({
        where: {
          userId: user.id,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      })

      // Get last transaction
      const lastTransaction = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
          type: true,
          amount: true,
        },
      })

      return {
        ...user,
        totalSpent: totalSpent._sum.amount || 0,
        lastTransaction,
        isActive: true, // Implement based on your business logic
      }
    })
  )

  return successResponse({
    users: enhancedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

// POST /api/admin/users — create a new user
export const POST = async (request: Request) => {
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('@/lib/nextauth')
  const bcryptModule = await import('bcryptjs')
  const { emailService } = await import('@/lib/email')
  const { NextResponse } = await import('next/server')

  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { firstName, lastName, email, phone, password, role, adminRoleId, sendWelcomeEmail } = body

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: 'firstName, lastName, email, and password are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase().trim() }, ...(phone ? [{ phone }] : [])] },
  })
  if (existing) {
    return NextResponse.json({ error: 'A user with this email or phone already exists.' }, { status: 409 })
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let referralCode = ''
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    const codeExists = await prisma.user.findUnique({ where: { referralCode: code } })
    if (!codeExists) { referralCode = code; break }
  }
  if (!referralCode) return NextResponse.json({ error: 'Could not generate referral code.' }, { status: 500 })

  const passwordHash = await bcryptModule.default.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      firstName, lastName,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      passwordHash, referralCode,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      adminRoleId: role === 'ADMIN' && adminRoleId ? adminRoleId : null,
      isVerified: true,
      emailVerified: new Date(),
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, createdAt: true },
  })

  if (sendWelcomeEmail) {
    await emailService.sendEmail({
      to: email,
      subject: 'Welcome to NillarPay — Your Account has been Created',
      html: `<p>Hi ${firstName},</p><p>Your NillarPay account has been created by an administrator.</p><p><strong>Email:</strong> ${email}<br/><strong>Temporary Password:</strong> ${password}</p><p>Please log in and change your password immediately.</p>`,
      text: `Hi ${firstName},\n\nEmail: ${email}\nTemporary Password: ${password}\n\nChange your password after first login.`,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, data: user }, { status: 201 })
}
