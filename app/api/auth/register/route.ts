import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateReferralCode, formatPhoneNumber, generateOTP } from '@/lib/auth'
import { smsService } from '@/lib/sms'
import { emailService } from '@/lib/email'
import { z } from 'zod'

export const runtime = 'nodejs'

const registerSchema = z.object({
  // Accept both formats: fullName or firstName/lastName
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(),
  pin: z.string().min(6, 'PIN must be 6 digits').max(6, 'PIN must be 6 digits').regex(/^\d+$/, 'PIN must contain only numbers').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  referralCode: z.string().optional(),
  acceptedMarketing: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  console.log('🚀 Registration endpoint hit');
  try {
    const body = await request.json()
    console.log('📥 Registration request body:', JSON.stringify(body, null, 2));
    console.log('📝 Registration request body:', JSON.stringify(body, null, 2))
    
    const parsed = registerSchema.parse(body)
    
    // Handle both fullName and firstName/lastName formats
    let firstName = parsed.firstName || ''
    let lastName = parsed.lastName || ''
    
    if (parsed.fullName && !firstName && !lastName) {
      const nameParts = parsed.fullName.trim().split(/\s+/)
      firstName = nameParts[0]
      lastName = nameParts.slice(1).join(' ') || nameParts[0]
    }
    
    // Validate names are not empty
    if (!firstName) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      )
    }

    // Handle phone number formats
    const phoneNumber = parsed.phoneNumber || parsed.phone
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const { email, pin, password, referralCode, acceptedMarketing } = parsed

    // Get password - accept either pin or password field
    const passwordValue = password || pin
    if (!passwordValue) {
      return NextResponse.json(
        { error: 'Password or PIN is required' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    console.log('📞 Formatted phone:', formattedPhone)

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone: formattedPhone },
        ],
      },
    })

    console.log('Existing user check result:', existingUser)

    if (existingUser) {
      if (existingUser.email === email) {
        console.log('Email already exists:', email)
        return NextResponse.json(
          { error: `Email already registered: ${email}. Please use a different email or sign in instead.` },
          { status: 400 }
        )
      } else if (existingUser.phone === formattedPhone) {
        console.log('Phone already exists:', formattedPhone)
        return NextResponse.json(
          { error: `Phone number already registered: ${formattedPhone}. Please use a different phone number or sign in instead.` },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'User with this email or phone already exists' },
          { status: 400 }
        )
      }
    }

    // Validate referral code if provided
    let referrerId = null
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
      })
      if (!referrer) {
        return NextResponse.json(
          { error: 'Invalid referral code' },
          { status: 400 }
        )
      }
      referrerId = referrer.id
    }

    // Hash password
    const passwordHash = await hashPassword(passwordValue)

    // Generate unique referral code
    let newReferralCode
    do {
      newReferralCode = generateReferralCode()
    } while (await prisma.user.findUnique({ where: { referralCode: newReferralCode } }))

    // Create user (not verified initially)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: formattedPhone,
        passwordHash,
        referralCode: newReferralCode,
        referredBy: referrerId,
        credits: referrerId ? 100 : 0, // ₦100 bonus for referred users
        isVerified: false, // User must verify OTP first
      },
    })

    // Create referral record if user was referred
    if (referrerId) {
      await prisma.$transaction(async (tx) => {
        // Create referral record
        await tx.referral.create({
          data: {
            referrerId,
            referredId: user.id,
            reward: 100,
            status: 'COMPLETED',
          },
        })

        // Add credits to referrer
        await tx.user.update({
          where: { id: referrerId },
          data: {
            credits: {
              increment: 100,
            },
          },
        })
      })
    }

    // Generate and store OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.oTP.create({
      data: {
        phone: formattedPhone,
        code: otpCode,
        type: 'REGISTER',
        expiresAt,
      },
    })

    // Send OTP via SMS and Email
    console.log(`✅ OTP Generated for ${formattedPhone}: ${otpCode}`);
    
    // Send SMS
    try {
      const smsPhone = smsService.formatPhoneForSMS(formattedPhone);
      await smsService.sendOTP(smsPhone, otpCode);
      console.log(`📱 SMS sent successfully to ${formattedPhone}`);
    } catch (smsError) {
      console.error('❌ Failed to send SMS:', smsError);
      console.log(`💡 Use this OTP for testing: ${otpCode}`);
      // Continue with registration even if SMS fails
    }

    // Send Email
    try {
      await emailService.sendOTP(email, otpCode);
      console.log(`📧 Email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      console.log(`💡 Use this OTP for testing: ${otpCode}`);
      // Continue with registration even if email fails
    }

    const responseData = {
      success: true,
      message: 'Registration successful. Please verify your phone number.',
      requiresVerification: true, // Signal frontend to show OTP screen
      data: {
        phone: formattedPhone,
        userId: user.id, // Add user ID for OTP verification
      }
    };
    
    console.log('📤 Backend sending response:', JSON.stringify(responseData, null, 2));
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ Registration error:', error)
    
    if (error instanceof z.ZodError) {
      console.log('🔍 Validation errors:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        { error: error.errors[0].message, validationErrors: error.errors },
        { status: 400 }
      )
    }

    // Add more specific error logging
    if (error instanceof Error) {
      console.log('💥 Error message:', error.message)
      console.log('📋 Error stack:', error.stack)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
