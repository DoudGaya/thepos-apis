import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP } from '@/lib/auth'
import { smsService } from '@/lib/sms'
import { emailService } from '@/lib/email'
import { z } from 'zod'

const resendOTPSchema = z.object({
  email: z.string().email('Valid email is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Resend OTP request body:', body)
    
    const { email } = resendOTPSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'User is already verified' },
        { status: 400 }
      )
    }

    // Delete any existing OTP for this user
    await prisma.oTP.deleteMany({
      where: {
        phone: user.phone,
        type: 'REGISTER',
      },
    })

    // Generate new OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.oTP.create({
      data: {
        phone: user.phone,
        code: otpCode,
        type: 'REGISTER',
        expiresAt,
      },
    })

    console.log(`✅ New OTP Generated for ${user.phone}: ${otpCode}`);

    // Send OTP via SMS and Email
    try {
      const smsPhone = smsService.formatPhoneForSMS(user.phone);
      await smsService.sendOTP(smsPhone, otpCode);
      console.log(`📱 SMS sent successfully to ${user.phone}`);
    } catch (smsError) {
      console.error('❌ Failed to send SMS:', smsError);
      console.log(`💡 Use this OTP for testing: ${otpCode}`);
    }

    try {
      await emailService.sendOTP(user.email, otpCode);
      console.log(`📧 Email sent successfully to ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      console.log(`💡 Use this OTP for testing: ${otpCode}`);
    }

    return NextResponse.json({
      success: true,
      message: 'OTP has been resent to your phone and email.',
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    
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
