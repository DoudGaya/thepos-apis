import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, password } = resetPasswordSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      )
    }

    // Verify OTP
    const otp = await prisma.oTP.findFirst({
      where: {
        phone: user.phone,
        code: token,
        type: 'PASSWORD_RESET',
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!otp) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Delete used OTP
    await prisma.oTP.delete({
      where: { id: otp.id },
    })

    return NextResponse.json({
      message: 'Password reset successfully',
      success: true,
    })
  } catch (error) {
    console.error('Reset password error:', error)
    
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
