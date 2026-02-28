import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken, formatPhoneNumber } from '@/lib/auth'
import { z } from 'zod'

export const runtime = 'nodejs'

// `identifier` accepts email or phone. `email` kept as alias for backward compat.
const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required').optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.identifier || data.email, {
  message: 'Email or phone number is required',
})

/** Returns true when the value looks like a phone number rather than an email */
function isPhoneNumber(value: string): boolean {
  return !value.includes('@') && /^[+\d]/.test(value.trim())
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.parse(body)
    const rawIdentifier = (parsed.identifier || parsed.email || '').trim()
    const { password } = parsed

    let user: any = null

    if (isPhoneNumber(rawIdentifier)) {
      // Try both raw and E.164-formatted phone numbers
      const formattedPhone = formatPhoneNumber(rawIdentifier)
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: rawIdentifier },
            { phone: formattedPhone },
          ],
        },
      })
    } else {
      // Email lookup — case-insensitive to support legacy mixed-case records
      user = await prisma.user.findFirst({
        where: {
          email: { equals: rawIdentifier.toLowerCase(), mode: 'insensitive' },
        },
      })
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: isPhoneNumber(rawIdentifier)
            ? 'No account found with this phone number'
            : 'No account found with this email address',
        },
        { status: 404 }
      )
    }

    // Check if user has completed password setup (Phase 3)
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account setup is incomplete. Please complete your registration by setting a password.',
          requiresPasswordSetup: true,
          email: user.email,
          phone: user.phone
        },
        { status: 403 }
      )
    }

    // Check Password
    const isValidPassword = await comparePassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Incorrect PIN. Please check your PIN and try again.' 
        },
        { status: 401 }
      )
    }

    // Check if user is verified
    if (!user.isVerified) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Your account is not verified. Please verify your account first.',
          requiresOtp: true,
          email: user.email,
          phone: user.phone
        },
        { status: 403 }
      )
    }

    // Generate tokens
    const accessToken = generateToken({ userId: user.id, role: user.role })
    const refreshToken = generateToken({ userId: user.id, role: user.role }, '7d')

    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Login successful',
      success: true,
      token: accessToken,
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
