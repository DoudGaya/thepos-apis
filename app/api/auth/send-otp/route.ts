import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOTP, formatPhoneNumber } from '@/lib/auth'
// import { consumeToken } from '@/lib/rateLimiter'
import { consumeToken } from '@/lib/rateLimiter'
import { smsService } from '@/lib/sms'
import { emailService } from '@/lib/email'
import { z } from 'zod'

export const runtime = 'nodejs'

const sendOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  type: z.enum(['REGISTER', 'LOGIN', 'FORGOT_PASSWORD', 'SOCIAL_ONBOARDING']),
  email: z.string().email('Valid email is required').optional(),
})

export async function POST(request: NextRequest) {
  console.log('🚀 Send OTP endpoint hit')
  try {
    const body = await request.json()
    console.log('📥 Send OTP request:', {
      phone: body.phone,
      type: body.type,
      email: body.email ? '***' : undefined,
    })

    const parsed = sendOtpSchema.parse(body)

    // Format phone number
    const formattedPhone = formatPhoneNumber(parsed.phone)
    console.log('📞 Formatted phone:', formattedPhone)

    // Rate limit per phone: max 3 sends per 15 minutes
    const rl = consumeToken(`sendotp:${formattedPhone}`, 3, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many OTP requests. Please try again later.' }, { status: 429 })
    }

    // For LOGIN type, verify user exists
    if (parsed.type === 'LOGIN') {
      const user = await prisma.user.findUnique({
        where: { phone: formattedPhone },
      })

      if (!user) {
        return NextResponse.json(
          { error: `No account found with phone number: ${formattedPhone}. Please register first.` },
          { status: 404 }
        )
      }
    }

    // For REGISTER type, check if user exists and their verification status
    if (parsed.type === 'REGISTER') {
      const whereConditions: any[] = [{ phone: formattedPhone }]
      if (parsed.email) {
        whereConditions.push({ email: parsed.email })
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: whereConditions,
        },
      })

      if (existingUser) {
        // ✅ If user is NOT verified, allow resending OTP
        if (!existingUser.isVerified) {
          console.log(`✔️  User exists but not verified (isVerified=false). Allowing OTP resend for: ${formattedPhone}`)
          // Continue - allow them to get a new OTP
        } else {
          // ❌ If user IS verified, reject
          if (existingUser.email === parsed.email) {
            return NextResponse.json(
              { error: `Email ${parsed.email} is already registered and verified. Please sign in or use a different email.` },
              { status: 400 }
            )
          } else if (existingUser.phone === formattedPhone) {
            return NextResponse.json(
              { error: `Phone number ${formattedPhone} is already registered and verified. Please sign in or use a different phone number.` },
              { status: 400 }
            )
          } else {
            return NextResponse.json(
              { error: 'This email or phone number is already registered and verified. Please sign in instead.' },
              { status: 400 }
            )
          }
        }
      }
    }

    // For FORGOT_PASSWORD type, verify user exists
    if (parsed.type === 'FORGOT_PASSWORD') {
      const user = await prisma.user.findUnique({
        where: { email: parsed.email || formattedPhone },
      })

      if (!user) {
        return NextResponse.json(
          { error: `No account found with ${parsed.email ? 'email: ' + parsed.email : 'phone: ' + formattedPhone}. Please register first.` },
          { status: 404 }
        )
      }
    }

    // For SOCIAL_ONBOARDING type, check if phone is already in use by another verified user
    if (parsed.type === 'SOCIAL_ONBOARDING') {
      const existingUser = await prisma.user.findFirst({
        where: { 
          phone: formattedPhone,
          isVerified: true,
          // Exclude social-prefixed phones (placeholders)
          NOT: {
            phone: { startsWith: 'social_' }
          }
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: `Phone number ${formattedPhone} is already linked to another account. Please use a different phone number.` },
          { status: 400 }
        )
      }
    }

    // Generate OTP code
    const otpCode = generateOTP()
    console.log(`✅ Generated OTP for ${formattedPhone}: ${otpCode}`)

    // Expire old OTPs for this phone/type combo
    await prisma.oTP.updateMany({
      where: {
        phone: formattedPhone,
        type: parsed.type,
        used: false,
      },
      data: {
        used: true,
      },
    })

    // Create new OTP record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const otp = await prisma.oTP.create({
      data: {
        phone: formattedPhone,
        code: otpCode,
        type: parsed.type,
        expiresAt,
      },
    })

    console.log('💾 OTP stored in database:', {
      id: otp.id,
      phone: otp.phone,
      type: otp.type,
      expiresAt: otp.expiresAt,
    })

    // Send OTP via SMS
    try {
      const smsPhone = smsService.formatPhoneForSMS(formattedPhone)
      const typeLabel = parsed.type === 'REGISTER' ? 'registration' : 
                        parsed.type === 'LOGIN' ? 'login' : 
                        parsed.type === 'SOCIAL_ONBOARDING' ? 'account verification' : 'password reset'
      const message = `Your ${typeLabel} OTP is: ${otpCode}. Valid for 10 minutes. Do not share this code.`
      await smsService.sendOTP(smsPhone, otpCode)
      console.log(`📱 SMS sent successfully to ${formattedPhone}`)
    } catch (smsError) {
      console.error('❌ Failed to send SMS:', smsError)
      console.log(`💡 Use this OTP for testing: ${otpCode}`)
      // Continue - SMS is not critical for backend flow
    }

    // Send OTP via Email if provided
    if (parsed.email) {
      try {
        await emailService.sendOTP(parsed.email, otpCode)
        console.log(`📧 Email sent successfully to ${parsed.email}`)
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError)
        console.log(`💡 Use this OTP for testing: ${otpCode}`)
        // Continue - Email is not critical for backend flow
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: formattedPhone,
        expiresAt,
        expiresIn: 600, // seconds
      },
    })
  } catch (error) {
    console.error('❌ Send OTP error:', error)

    if (error instanceof z.ZodError) {
      console.log('🔍 Validation errors:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      console.error('💥 Error message:', error.message)
      console.error('📋 Error stack:', error.stack)
    }

    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
