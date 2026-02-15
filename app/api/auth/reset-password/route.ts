import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const resetPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
  // Accept both 'newPassword' and 'password' for compatibility
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  // Accept both 'otp' and 'token' for compatibility
  otp: z.string().length(6, 'OTP must be 6 digits').optional(),
  token: z.string().length(6, 'Token must be 6 digits').optional(),
}).refine(data => data.newPassword || data.password, {
  message: 'Password is required',
  path: ['password'],
}).refine(data => data.otp || data.token, {
  message: 'OTP/Token is required',
  path: ['otp'],
})

export async function POST(request: NextRequest) {
  console.log('🚀 Reset Password endpoint hit')
  try {
    const body = await request.json()
    console.log('📥 Reset Password request:', {
      email: body.email,
      hasOtp: !!body.otp,
      hasToken: !!body.token,
    })

    const parsed = resetPasswordSchema.parse(body)

    // Normalize field names
    const otpCode = parsed.otp || parsed.token || ''
    const newPassword = parsed.newPassword || parsed.password || ''

    // Verify OTP - accept both PASSWORD_RESET (from /forgot-password) and FORGOT_PASSWORD (from /send-otp)
    const otp = await prisma.oTP.findFirst({
      where: {
        code: otpCode,
        type: {
          in: ['PASSWORD_RESET', 'FORGOT_PASSWORD'],
        },
        used: false,
      },
    })

    if (!otp) {
      console.log('❌ Invalid or already used OTP')
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Check OTP expiry
    if (new Date() > otp.expiresAt) {
      console.log('❌ OTP expired')
      return NextResponse.json(
        { error: 'OTP has expired' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
    })

    if (!user) {
      console.log('❌ User not found')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user password and mark OTP as used
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      }),
      prisma.oTP.update({
        where: { id: otp.id },
        data: { used: true },
      }),
    ])

    console.log('✅ Password reset successfully for:', parsed.email)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('❌ Reset Password error:', error)

    if (error instanceof z.ZodError) {
      console.log('🔍 Validation errors:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      console.error('💥 Error message:', error.message)
    }

    return NextResponse.json(
      { error: 'An error occurred while resetting password' },
      { status: 500 }
    )
  }
}
