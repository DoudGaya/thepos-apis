import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken, formatPhoneNumber } from '@/lib/auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  pin: z.string().min(6, 'PIN must be 6 digits').max(6, 'PIN must be 6 digits'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, pin } = loginSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No account found with this email address' 
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

    // Check PIN
    const isValidPassword = await comparePassword(pin, user.passwordHash)
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
