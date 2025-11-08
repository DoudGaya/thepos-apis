import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, formatPhoneNumber } from '@/lib/auth'
import { smsService } from '@/lib/sms'
import { emailService } from '@/lib/email'
import { z } from 'zod'
// import { consumeToken } from '@/lib/rateLimiter'
import { consumeToken } from '@/lib/rateLimiter'
// import { consumeToken } from '@/app/lib/rateLimiter'

const resendOTPSchema = z.object({
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional(),
  type: z.string().optional(),
}).refine((data) => !!(data.email || data.phone), {
  message: 'Either email or phone is required',
  path: ['email', 'phone'],
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Resend OTP request body:', body)
    
    const parsed = resendOTPSchema.parse(body)

    // Resolve user by email or phone (format phone into canonical form)
    let user = null
    if (parsed.email) {
      user = await prisma.user.findUnique({ where: { email: parsed.email } })
    } else if (parsed.phone) {
      const formatted = formatPhoneNumber(parsed.phone)
      console.log('Looking up user by formatted phone:', formatted)
      user = await prisma.user.findUnique({ where: { phone: formatted } })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

  // Rate limit resend per phone: max 3 per 15 minutes
  const rl = consumeToken(`resendotp:${user.phone}`, 3, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many resend attempts. Please try again later.' }, { status: 429 })
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
    // Attempt to send OTP via SMS
    let smsSent = false
    try {
      const smsPhone = smsService.formatPhoneForSMS(user.phone);
      const smsResult = await smsService.sendOTP(smsPhone, otpCode)
      // smsService may return boolean or throw; handle both
      smsSent = typeof smsResult === 'boolean' ? smsResult : false
      if (smsSent) {
        console.log(`📱 SMS sent successfully to ${user.phone}`)
      } else {
        console.warn('⚠️ SMS service reported failure (no throw)')
      }
    } catch (smsError) {
      console.error('❌ Failed to send SMS:', smsError)
    }

    // Attempt to send OTP via Email
    let emailSent = false
    try {
      const emailResult = await emailService.sendOTP(user.email, otpCode)
      emailSent = emailResult === true
      if (emailSent) {
        console.log(`📧 Email sent successfully to ${user.email}`)
      } else {
        console.warn('⚠️ Email service reported failure (no throw)')
        console.log(`💡 Use this OTP for testing: ${otpCode}`)
      }
    } catch (emailError) {
      console.error('❌ Failed to send email (threw):', emailError)
      console.log(`💡 Use this OTP for testing: ${otpCode}`)
    }

    const messageParts = []
    if (smsSent) messageParts.push('SMS')
    if (emailSent) messageParts.push('Email')
    const deliveredTo = messageParts.length ? messageParts.join(' and ') : 'none'

    return NextResponse.json({
      success: true,
      message: `OTP generated and delivered to: ${deliveredTo}`,
      details: { smsSent, emailSent },
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
