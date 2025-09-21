import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/auth'
import { emailService } from '@/lib/email'
import { smsService } from '@/lib/sms'
import { z } from 'zod'

export const runtime = 'nodejs'

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account with this email exists, you will receive a reset code.',
        success: true,
      })
    }

    // Generate and store OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete existing password reset OTPs for this user
    await prisma.oTP.deleteMany({
      where: {
        phone: user.phone,
        type: 'PASSWORD_RESET',
      },
    })

    await prisma.oTP.create({
      data: {
        phone: user.phone,
        code: otpCode,
        type: 'PASSWORD_RESET',
        expiresAt,
      },
    })

    // Send OTP via both email and SMS
    console.log(`🔄 Password reset OTP for ${email}: ${otpCode}`)
    
    // Try to send via email
    const emailSent = await emailService.sendPasswordResetOTP(email, otpCode);
    if (emailSent) {
      console.log(`✅ Password reset email sent to ${email}`);
    } else {
      console.log(`❌ Failed to send password reset email to ${email}`);
    }

    // Also try to send via SMS as backup
    try {
      const formattedPhone = smsService.formatPhoneForSMS(user.phone);
      await smsService.sendOTP(formattedPhone, otpCode);
      console.log(`✅ Password reset SMS sent to ${user.phone}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset SMS to ${user.phone}:`, error);
    }

    console.log(`💡 Manual OTP for testing: ${otpCode}`);

    return NextResponse.json({
      message: 'If an account with this email exists, you will receive a reset code.',
      success: true,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    
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
